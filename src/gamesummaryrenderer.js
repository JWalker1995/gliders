var Config = require('./config.js');
var Util = require('./util.js');
var Callback = require('./callback.js');

module.exports = function(remote, game)
{
    var _this = this;

    var el;
    var els;

    this.show_setup_callback = new Callback();

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
        };

        var players = game.get_player_names();
        for (var i = 0; i < players.length; i++)
        {
            if (typeof players[i] === 'string')
            {
                els.players_list.childNodes[i].innerText = players[i];
            }
        }

        el.onmouseover = _this.show_setup_callback.call;

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
        els.players_list.childNodes[index].innerText = player_name;
    };

    init();
};
