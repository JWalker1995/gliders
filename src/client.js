var game_opts = {
    'cell_rad': 45,
    'cell_spacing': 50,
    'piece_rad': 30,
    'action_rad': 20,
    'stroke_width': 1,
    'piece_colors': ['#FFFFFF', '#888888'],
    'piece_king_colors': ['#FF0000', '#0000FF'],
    'piece_actions_colors': ['#FFCCCC', '#CCCCFF'],
    'num_players': 2,
    'num_spawns': 3,
};

// 3 actions:
// 1. Move piece - click on piece, then neighboring cells highlight. Click on highlighted cell to move
// 2. Shoot one or more gliders in sequence - click on glider center piece, then possible destinations highlight. Click on highlighted cell to shoot. Can shoot another afterwards.
// 3. Swap pieces
// In all cases, before clicking "end turn", you can undo your actions

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

    els.welcome_name.onblur = function()
    {
        remote.write({
            'q': 'set_name',
            'name': this.innerText,
        });
    };

    var renderer = new CreateGameRenderer(remote, undefined);
    els.create_game.appendChild(renderer.get_el());

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

        game = new Game(game_opts, 0);
        controller = new GameController(game);
        renderer = new GameRenderer(controller, els);
    });

    remote.register_handler('open_games_push', function(data)
    {
        var renderer = new CreateGameRenderer(remote, data.game);
        els.games_list.appendChild(renderer.get_el());
    });

    // Debug stuff:
    game = new Game(game_opts, undefined);
    controller = new GameController(game, remote);
    renderer = new GameRenderer(controller, els);
    game.update_board('5');
    game.update_formation('3,3,e,e,e,e,e,e,e,k');
};
