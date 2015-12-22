// 3 actions:
// 1. Move piece - click on piece, then neighboring cells highlight. Click on highlighted cell to move
// 2. Shoot one or more gliders in sequence - click on glider center piece, then possible destinations highlight. Click on highlighted cell to shoot. Can shoot another afterwards.
// 3. Swap pieces
// In all cases, before clicking "end turn", you can undo your actions

var Remote = require('./remote.js');
var Game = require('./game.js');
var GameRenderer = require('./gamerenderer.js');
var CreateGameRenderer = require('./creategamerenderer.js');
var GameSummaryRenderer = require('./gamesummaryrenderer.js');
var Util = require('./util.js');

var els;

var remote;

var game;
var controller;
var renderer;

window.onload = function()
{
    remote = new Remote(undefined, Primus.connect());

    els = {
        'error_container': document.getElementById('error_container'),

        'welcome_container': document.getElementById('welcome_container'),
        'connect_container': document.getElementById('connect_container'),
        'controls_container': document.getElementById('controls_container'),
        'board_container': document.getElementById('board_container'),

        // Weocome container
        'welcome_name': document.getElementById('welcome_name'),
        'welcome_name_spinner': document.getElementById('welcome_name_spinner'),

        // Connect container
        'games_list': document.getElementById('games_list'),
        'create_game': document.getElementById('create_game'),

        // Controls container
        'end_turn': document.getElementById('control_end_turn'),

        // Board container
        'board': document.getElementById('board'),
    };

    game = new Game(undefined);
    renderer = new GameRenderer(game, els);

    game.update_board('5');
    game.update_formation('5 3 e e e e e e n e e e n e e n n n e e n e k e e e n e n n e n n e e');
    game.update_options('spawns=2');

    var create_renderer = new CreateGameRenderer(remote, game);
    els.create_game.appendChild(create_renderer.get_el());

    var cur_name;
    var open_games = [];

    els.welcome_name.onblur = function()
    {
        if (!this.innerText || this.innerText === cur_name)
        {
            this.innerText = cur_name;
            return;
        }

        Util.add_class(els.welcome_name, 'disabled');
        Util.remove_class(els.welcome_name_spinner, 'hidden');

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

    remote.register_handler('error', function(data)
    {
        var el = document.createElement('div');
        Util.add_class(el, 'error');
        el.innerText = data.msg;

        els.error_container.appendChild(el);
        setTimeout(function()
        {
            els.error_container.removeChild(el);
        }, 5000);
    });

    remote.register_handler('set_name', function(data)
    {
        cur_name = data.name;
        els.welcome_name.innerText = data.name;

        Util.remove_class(els.welcome_name, 'disabled');
        Util.add_class(els.welcome_name_spinner, 'hidden');
    });
    remote.register_handler('error_set_name', function(data)
    {
        els.welcome_name.innerText = cur_name;

        Util.remove_class(els.welcome_name, 'disabled');
        Util.add_class(els.welcome_name_spinner, 'hidden');
    });

    remote.register_handler('start_game', function(data)
    {
        var summary_renderer = open_games[data.game_id];
        if (typeof summary_renderer === 'undefined') {return;}

        els.games_list.removeChild(summary_renderer.get_el());
        open_games[data.game_id] = undefined;

        var open_game = summary_renderer.get_game();

        game.update_board(open_game.get_board_code());
        game.update_formation(open_game.get_formation_code());
        game.update_options(open_game.get_options_code());
    });

    remote.register_handler('open_games_push', function(data)
    {
        var open_game = new Game();
        open_game.deserialize(data.game);

        var summary_renderer = new GameSummaryRenderer(remote, open_game);
        summary_renderer.show_setup_callback.add(function()
        {
            game.update_board(open_game.get_board_code());
            game.update_formation(open_game.get_formation_code());
            game.update_options(open_game.get_options_code());
        });

        els.games_list.appendChild(summary_renderer.get_el());
        open_games[open_game.get_game_id()] = summary_renderer;
    });

    remote.register_handler('join_game_notif', function(data)
    {
        var renderer = open_games[data.game_id];
        if (typeof renderer === 'undefined') {return;}

        renderer.join_player(data.player_name);
    });
};
