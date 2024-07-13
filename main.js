class Fruit {
    // Only used for the current fruit
    constructor(
        type,
        circle,
        isStatic = true,
        x = gameWidth / 2,
        y = gameHeight / 12 - fruits[type].size / 2,
        added = false
    ) {
        // number
        this.type = type;
        // matter.bodies
        // x value, y value, radius
        this.body = circle(x, y, fruits[type].size / 2, {
            isStatic: isStatic,
            render: {
                sprite: {
                    texture: `assets/${fruits[type].name}.png`,
                    xScale: 0.01 * fruits[type].size,
                    yScale: 0.01 * fruits[type].size,
                },
            },
            slop: 0.01,
        });
        this.added = added;
    }
}

// Gets main game area
const game = document.getElementById('game');
const scoreElement = document.getElementById('score');

const gameWidth = 300;
const gameHeight = 400;

// Game variables
let currentFruitObj;

// Score
let score = 0;

/**
 * Score system + fruit setup
 */

const fruits = [
    {
        name: 'cherry',
        size: 20,
        score: 2,
    },
];

const fruitNames = [
    'strawberry',
    'blueberry',
    'blackberry',
    'grape',
    // 'dekopon',
    'orange',
    'apple',
    'mango',
    // 'pear',
    'peach',
    'pineapple',
    // 'melon',
    'watermelon',
];

for (let i = 0; i < fruitNames.length; ++i) {
    let prevSize = fruits[i].size;
    let prevScore = fruits[i].score;
    let currentFruit = { name: fruitNames[i], size: prevSize + 4, score: prevScore + 2 };
    fruits.push(currentFruit);
}

/**
 * Game mechanics
 * Drop a random fruit onto the area
 *   - physics
 * Combine two of the same fruit to get to the next type
 * Add x score for combining fruits together (the fruit it was before combination is used for this)
 *
 */
const thickness = 20;
const wallOptions = {
    isStatic: true,
    render: { lineWidth: 1 },
};

const createNewGame = (comp, Composite, circle) => {
    score = 0;
    updateScoreElement();
    // Default fruit type is cherry
    // Create a circle to be the user's current fruit
    let currentFruitObj = new Fruit(0, circle);

    Composite.add(comp, [currentFruitObj.body]);

    currentFruitObj.added = true;

    return currentFruitObj;
};

onload = (_) => {
    // module aliases
    let Engine = Matter.Engine,
        Render = Matter.Render,
        Runner = Matter.Runner,
        Bodies = Matter.Bodies,
        Body = Matter.Body,
        Mouse = Matter.Mouse,
        Composite = Matter.Composite,
        Events = Matter.Events;

    // create an engine
    let engine = Engine.create();

    // create a renderer
    let render = Render.create({
        element: game,
        engine: engine,
        options: { width: gameWidth, height: gameHeight, wireframes: false },
    });

    let mouse = Mouse.create(document.body);

    let currentFruitObj = createNewGame(engine.world, Composite, Bodies.circle);

    // add all of the bodies to the world
    Composite.add(engine.world, [
        Bodies.rectangle(gameWidth / 2, gameHeight + thickness / 2, gameWidth, thickness, wallOptions),
        Bodies.rectangle(gameWidth + thickness / 2, gameHeight / 2, thickness, gameHeight, wallOptions),
        Bodies.rectangle(gameWidth / 2, 0 - thickness / 2, gameWidth, thickness, wallOptions),
        Bodies.rectangle(0 - thickness / 2, gameHeight / 2, thickness, gameHeight, wallOptions),
    ]);

    const minPosition = 0;
    const maxPosition = gameWidth;

    // Move the current fruit around the game
    document.onmousemove = (_) => {
        if (runner.enabled) {
            let fruitRadius = fruits[currentFruitObj.type].size / 2;

            // Get cursor with other factors accounted for
            let cursorPosition = mouse.position.x;

            Body.setPosition(currentFruitObj.body, {
                // Have the x be within the bounds of the game
                x: Math.max(minPosition + fruitRadius, Math.min(cursorPosition, maxPosition - fruitRadius)),
                // Keep y consistent (meant to be kept up until dropped)
                y: gameHeight / 12 - fruitRadius,
            });
        }
    };

    // Add a new fruit to the user
    // Drop the fruit
    document.onmousedown = (_) => {
        if (runner.enabled) {
            if (currentFruitObj.added === true) {
                const droppedFruit = currentFruitObj;

                // Drop the fruit currently held
                Body.setStatic(droppedFruit.body, false);

                // Select a new fruit
                let cursorPosition = mouse.position.x;
                currentFruitObj = changeCurrentFruit(Bodies.circle, cursorPosition);
                setTimeout(() => {
                    Composite.add(engine.world, [currentFruitObj.body]);
                    currentFruitObj.added = true;
                }, 300);
            }
        }
    };

    // run the renderer
    Render.run(render);

    render.mouse = mouse;

    // create runner
    let runner = Runner.create();

    // run the engine
    Runner.run(runner, engine);

    const endGame = () => {
        // Remove all fruits from the page
        Body.setStatic(currentFruitObj.body, false);
        Composite.clear(engine.world, true);

        // Pause the game
        runner.enabled = false;

        // Display "you lose"
        const overlay = document.getElementById('overlay');
        overlay.className = 'visible';

        const dead = document.getElementById('dead');
        const endScore = document.getElementById('end-score');
        endScore.innerText = `Your score was ${score} points.`;
        dead.className = 'visible';
        dead.children
            .item(0)
            .children.item(2)
            .addEventListener('click', () => {
                // Create a new game
                currentFruitObj = createNewGame(engine.world, Composite, Bodies.circle);
                overlay.className = '';
                dead.className = '';
                runner.enabled = true;
            });
    };

    // Check when there is a collision between two fruits
    Events.on(engine, 'collisionStart', function (event) {
        let pairs = event.pairs;
        pairs.forEach((pair) => {
            if (pair.bodyA.label != 'Rectangle Body' && pair.bodyB.label != 'Rectangle Body') {
                // Lose condition for the game
                if (pair.bodyA.isStatic === true || pair.bodyB.isStatic === true) {
                    endGame();
                }
                if (pair.bodyA.render.sprite.texture === pair.bodyB.render.sprite.texture) {
                    // Combine fruits of the same type
                    const t = fruits.findIndex(
                        (e) => e.name === pair.bodyA.render.sprite.texture.split('/')[1].split('.')[0]
                    );
                    let newFruitIndex = t + 1;
                    // Remove both of the old fruits from the world
                    Composite.remove(engine.world, pair.bodyA);
                    Composite.remove(engine.world, pair.bodyB);
                    let coords = {};
                    // Create a new fruit roughly at the position of the two previous fruit
                    // Get rough coordinates for the new fruit
                    const contacts = pair.contacts;
                    for (let i = 0; i < contacts.length; ++i) {
                        if (contacts[i] != undefined) {
                            let vertex = contacts[i].vertex;
                            coords.x = vertex.x;
                            coords.y = vertex.y;
                            break;
                        }
                    }
                    // Create a new fruit
                    const newFruit = new Fruit(newFruitIndex, Bodies.circle, false, coords.x, coords.y, true);
                    updateScoreElement(fruits[newFruitIndex].score);
                    Composite.add(engine.world, [newFruit.body]);
                }
            }
        });
    });
};

const changeCurrentFruit = (circle, xPos) => {
    // Create RNG to choose what the new fruit is
    // index 0 1 2 3 4
    // 0 -> 60%
    // 1 -> 20%
    // 2 -> 10%
    // 3 -> 7.5%
    // 4 -> 2.5%
    const rng = Math.floor(Math.random() * 1000);
    let newFruitIndex;
    if (rng < 25) {
        newFruitIndex = 4;
    } else if (rng < 100) {
        newFruitIndex = 3;
    } else if (rng < 200) {
        newFruitIndex = 2;
    } else if (rng < 400) {
        newFruitIndex = 1;
    } else {
        newFruitIndex = 0;
    }
    return new Fruit(newFruitIndex, circle, undefined, xPos);
};

const updateScoreElement = (addScore = 0) => {
    // Adds any score that is passed through
    score += addScore;
    // Update on the screen
    scoreElement.innerText = `Current score: ${score}`;
};
