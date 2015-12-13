// 3 actions:
// 1. Move piece - click on piece, then neighboring cells highlight. Click on highlighted cell to move
// 2. Shoot one or more gliders in sequence - click on glider center piece, then possible destinations highlight. Click on highlighted cell to shoot. Can shoot another afterwards.
// 3. Swap pieces
// In all cases, before clicking "end turn", you can undo your actions

var Remote = require('./remote.js');
var Game = require('./game.js');
var GameController = require('./gamecontroller.js');
var GameRenderer = require('./gamerenderer.js');
var CreateGameRenderer = require('./creategamerenderer.js');

var els;

var remote;

var game;
var controller;
var renderer;

window.onload = function()
{
    remote = new Remote(undefined, Primus.connect());

    els = {
        'welcome_container': document.getElementById('welcome_container'),
        'connect_container': document.getElementById('connect_container'),
        'controls_container': document.getElementById('controls_container'),
        'board_container': document.getElementById('board_container'),

        // Weocome container
        'welcome_name': document.getElementById('welcome_name'),

        // Connect container
        'games_list': document.getElementById('games_list'),
        'create_game': document.getElementById('create_game'),

        // Controls container
        'end_turn': document.getElementById('control_end_turn'),

        // Board container
        'board': document.getElementById('board'),
    };

    game = new Game(undefined);
    controller = new GameController(game, remote);
    renderer = new GameRenderer(controller, els, 0);

    game.update_board('5');
    game.update_formation('5 3 e e e e e e n e e e n e e n n n e e n e k e e e n e n n e n n e e');
    game.update_options('spawns=2');

    var renderer = new CreateGameRenderer(remote, game, true);
    els.create_game.appendChild(renderer.get_el());

    var open_games = [];

    els.welcome_name.onblur = function()
    {
        remote.write({
            'q': 'set_name',
            'name': this.innerText,
        });
    };

    /*
    els.create_game_preset.onchange = function()
    {
        if (!this.value) {return;}
        var parts = this.value.split('/');
        els.create_game_board.value = parts[0] || '';
        els.create_game_formation.value = parts[1] || '';
        els.create_game_options.value = parts[2] || '';
    };

    els.create_game_board.onkeyup = els.create_game_formation.onkeyup = function()
    {
        game.update_board(els.create_game_board.value);
        game.update_formation(els.create_game_formation.value);
    };

    els.create_game_button.onclick = function()
    {
        remote.write({
            'q': 'create_game',
            'game': {
                'board': els.create_game_board.value,
                'formation': els.create_game_formation.value,
                'options': els.create_game_options.value,
            },
        });
    };
    */

    remote.register_handler('logged_in', function(data)
    {
        els.login_container.style.display = 'none';
    });

    remote.register_handler('start_game', function(data)
    {
        if (renderer) {renderer.destruct();}
        if (controller) {controller.destruct();}
        if (game) {game.destruct();}

        game = new Game(0);
        controller = new GameController(game);
        renderer = new GameRenderer(controller, els);
    });

    remote.register_handler('open_games_push', function(data)
    {
        var game = new Game();
        game.deserialize(data.game);

        var renderer = new CreateGameRenderer(remote, game, false);
        els.games_list.appendChild(renderer.get_el());

        open_games[game.get_game_id()] = renderer;
    });

    remote.register_handler('join_game_notif', function(data)
    {
        var renderer = open_games[data.game_id];
        if (typeof renderer === 'undefined') {return;}

        renderer.join_player(data.player_name);
    });
};
