var Config = require('./config.js');
var Util = require('./util.js');

module.exports = function(remote, game)
{
    var _this = this;

    var el;
    var els;

    var init = function()
    {
        var html = '';
        html += '<div class="open_game_join">Join</div>';
        html += '<div class="open_game_summary">'
            html += '<span class="open_game_players_list">';
                var num_players = game.get_num_players();
                for (var i = 0; i < num_players; i++)
                {
                    html += '<span class="open_game_player" style="color: ' + Config.piece_colors[i] + ';">?</span>';
                }
                /*
                html += '<span class="open_game_players_have"></span>';
                html += ' / ';
                html += '<span class="open_game_players_need"></span>';
                */
            html += '</span>';
            html += '<span class="open_game_timer"></span>'
        html += '</div>';

        el = document.createElement('div');
        Util.add_class(el, 'open_game');
        el.innerHTML = html;

        els = {
            'join': el.getElementsByClassName('open_game_join')[0],
            'players_list': el.getElementsByClassName('open_game_players_list')[0],
            'timer': el.getElementsByClassName('open_game_timer')[0],
            'board': el.getElementsByClassName('open_game_board')[0],
            'formation': el.getElementsByClassName('open_game_formation')[0],
            'options': el.getElementsByClassName('open_game_options')[0],
            'button': el.getElementsByClassName('open_game_button')[0],
        };

        var players = game.get_player_names();
        for (var i = 0; i < players.length; i++)
        {
            if (typeof players[i] === 'string')
            {
                _this.join_player(players[i]);
            }
        }

        el.onclick = function()
        {
            Util.toggle_class(el, 'expanded');
        };

        els.join.onclick = function()
        {
            remote.write({
                'q': 'join_game',
                'game_id': game.get_game_id(),
            });
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
