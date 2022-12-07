const db = require('./database');

const friends = [];

const init = async () => {

    try {
        await db.run('CREATE TABLE Users (id INTEGER PRIMARY KEY AUTOINCREMENT, name varchar(32));');
        await db.run('CREATE TABLE Friends (id INTEGER PRIMARY KEY AUTOINCREMENT, userId int, friendId int);');
        const users = [];
        const names = ['foo', 'bar', 'baz'];
        for (let i = 0; i < 27000; ++i) {
            let n = i;
            let name = '';
            for (j = 0; j < 3; ++j) {
                name += names[n % 3];
                n = Math.floor(n / 3);
                name += n % 10;
                n = Math.floor(n / 10);
            }
            users.push(name);
            friends.push([]);
        }
        for (let i = 0; i < friends.length; ++i) {
            const n = 10 + Math.floor(90 * Math.random());
            const list = [...Array(n)].map(() => Math.floor(friends.length * Math.random()));
            list.forEach((j) => {
                if (i === j) {
                    return;
                }
                if (friends[i].indexOf(j) >= 0 || friends[j].indexOf(i) >= 0) {
                    return;
                }
                friends[i].push(j);
                friends[j].push(i);
            });
        }
        console.log("Init Users Table...");
        await Promise.all(users.map((un) => db.run(`INSERT INTO Users (name) VALUES ('${un}');`)));
        console.log("Init Friends Table...");
        await Promise.all(friends.map((list, i) => {
            Promise.all(list.map((j) => db.run(`INSERT INTO Friends (userId, friendId) VALUES (${i + 1}, ${j + 1});`)));
        }));
    } catch (e) {
        console.log('--->', e);
    }

    console.log("Ready.");
}
module.exports.init = init;

const search = async (req, res) => {
    const query = req.params.query;
    const userId = parseInt(req.params.userId);

    let step = 1;
    let flags = {};
    let deeps = [[userId-1], [], [], []];
    while(step < 4) {
        for (let i = 0; i < deeps[step -1].length; i ++) {
            let fs = friends[deeps[step-1][i]];
            for (let j = 0; j < fs.length; j ++) {
                if (flags[fs[j]]) continue;
                flags[fs[j]] = step;
                deeps[step].push(fs[j]);
            }
        }
        step ++;
    }

    console.log('ready-for-query');

    db.all(`SELECT id, name from Users where name LIKE '${query}%' LIMIT 100;`).then((results) => {

        for (let i = 0; i < results.length; i ++) {
            results[i]['connection'] = flags[results[i].id - 1];
        }

        res.statusCode = 200;
        res.json({
            success: true,
            users: results
        });
    }).catch((err) => {
        res.statusCode = 500;
        res.json({success: false, error: err});
    });
}
module.exports.search = search;

const addFriend = async (req, res) => {
    const query = req.params.query;
    const userId = parseInt(req.params.userId);
    const friendId = parseInt(req.params.friendId);

    friends[userId-1].push(friendId-1);
    friends[friendId-1].push(userId-1);

    await db.run(`INSERT INTO Friends (userId, friendId) VALUES (${userId}, ${friendId});`)
    await db.run(`INSERT INTO Friends (userId, friendId) VALUES (${friendId}, ${userId});`)

    res.json({
        success: true
    });
}
module.exports.addFriend = addFriend;

const removeFriend = async (req, res) => {
    const query = req.params.query;
    const userId = parseInt(req.params.userId);
    const friendId = parseInt(req.params.friendId);

    friends[userId-1].splice(friends[userId-1].indexOf(friendId-1), 1);
    friends[friendId-1].splice(friends[friendId-1].indexOf(userId-1), 1);

    await db.run(`DELETE FROM Friends WHERE userId=${userId} AND friendId=${friendId};`)
    await db.run(`DELETE FROM Friends WHERE userId=${friendId} AND friendId=${userId};`)

    res.json({
        success: true
    });
}
module.exports.removeFriend = removeFriend;