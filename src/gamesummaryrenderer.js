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

        var players = game.get_players();
        for (var i = 0; i < players.length; i++)
        {
            if (typeof players[i] !== 'undefined')
            {
                els.players_list.childNodes[i].innerText = players[i].get_name();
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

        // Debugging stuff to auto-join games
        // els.join.onclick();
    };

    this.get_el = function() {return el;};
    this.get_game = function() {return game;};

    this.join_player = function(player)
    {
        var players = game.get_players();
        var index = players.indexOf(undefined);
        if (index === -1) {index = players.length;}

        players[index] = player;
        els.players_list.childNodes[index].innerText = player.get_name();
    };

    this.remove_player = function(player)
    {
        var players = game.get_players();
        var index = players.indexOf(player);
        if (index !== -1)
        {
            players[index] = undefined;
            els.players_list.childNodes[index].innerText = '?';
        }
    };

    init();
};
