var Config = require('./config.js');
var Util = require('./util.js');
var Callback = require('./callback.js');

module.exports = function(remote, game, renderer)
{
    // Formations:
    // 5/5 3 e e e e e e n e e e n e e n n n e e n e k e e e n e n n e n n e e
    // 5/3 3 e e e e e e e k/spawns=10

    var _this = this;

    var el;
    var els;

    this.show_setup_callback = new Callback();

    var init = function()
    {
        var html = '';
        html += '<span class="text_input_label">Board code: </span>';
        html += '<span class="create_game_board text_input"' + (true ? ' contenteditable="true"' : '') + '>' + Util.escape_text(game.get_board_code()) + '</span>';
        html += '<br />';
        html += '<span class="text_input_label">Formation code: </span>';
        html += '<span class="create_game_formation text_input"' + (true ? ' contenteditable="true"' : '') + '>' + Util.escape_text(game.get_formation_code()) + '</span>';
        html += '<br />';
        html += '<span class="text_input_label">Options code: </span>';
        html += '<span class="create_game_options text_input"' + (true ? ' contenteditable="true"' : '') + '>' + Util.escape_text(game.get_options_code()) + '</span>';
        html += '<br />';
        html += '<span class="create_game_publish button">Publish</span>';

        el = document.createElement('div');
        Util.add_class(el, 'create_game_details');
        el.innerHTML = html;

        els = {
            'board': el.getElementsByClassName('create_game_board')[0],
            'formation': el.getElementsByClassName('create_game_formation')[0],
            'options': el.getElementsByClassName('create_game_options')[0],
            'publish': el.getElementsByClassName('create_game_publish')[0],
        };

        els.board.onkeyup = function()
        {
            game.update_board(els.board.innerText);
            renderer.show_game(game);
        };
        els.formation.onkeyup = function()
        {
            game.update_formation(els.formation.innerText);
            renderer.show_game(game);
        };
        els.options.onkeyup = function()
        {
            game.update_options(els.options.innerText);
            renderer.show_game(game);
        };

        el.onmouseover = _this.show_setup_callback.call;

        els.publish.onclick = function()
        {
            remote.write({
                'q': 'create_game',
                'game': game.serialize(),
            });
            el.parentNode.removeChild(el);
        };
    };

    this.get_el = function() {return el;};
    this.get_game = function() {return game;};

    this.join_player = function(player_name)
    {
        var players = game.get_player_names();
        var index = players.indexOf(undefined);
        if (index === -1) {index = players.length;}

        players[index] = player_name;
        debugger;
        els.players_list.childNodes[index].innerText = player_name;
    };

    this.update_game = function(new_game)
    {
        var update_prop = function(key)
        {
            if (game[key] !== new_game[key])
            {
                var el = els[key];
                el.innerText = game[key] = new_game[key];
                Util.add_class(el, 'create_game_changed');
                setTimeout(function()
                {
                    Util.remove_class(el, 'create_game_changed');
                }, 1000);
            }
        };
        update_prop('players_have');
        update_prop('players_need');
    };

    init();

    /*
                <fieldset class="create_game_options">
                    <legend>Create game</legend>
                    <select id="create_game_preset">
                        <option value="">-- Load preset --</option>
                        <option value="5/5,3,e,e,e,e,e,e,n,e,e,e,n,e,e,n,n,n,e,e,n,e,k,e,e,e,n,e,n,n,e,n,n,e,e">Shield</option>
                        <option value="5/3,3,e,e,e,e,e,e,e,k/spawns=10">Spawn from king</option>
                    </select>
                    <br />
                    <label for="create_game_board">Board code: </label>
                    <input id="create_game_board" type="text" value="5" />
                    <br />
                    <label for="create_game_formation">Formation code: </label>
                    <input id="create_game_formation" type="text" value="5,3,e,e,e,e,e,e,n,e,e,e,n,e,e,n,n,n,e,e,n,e,k,e,e,e,n,e,n,n,e,n,n,e,e" />
                    <br />
                    <label for="create_game_options">Options code: </label>
                    <input id="create_game_options" type="text" value="" />
                    <br />
                    <button id="create_game_button">Create game</button>
                </fieldset>
                */
};
