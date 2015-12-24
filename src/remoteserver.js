var ClientError = require('./clienterror.js');

module.exports = function(app, remote)
{
    var name;
    var name_locked = false;
    var in_games = [];

    remote.get_name = function() {return name;};

    var init = function()
    {
        name = app.make_guest_name();
        remote.write({
            'q': 'set_name',
            'name': name,
        });

        app.subscribe_open_games(remote);
    };

    var join_game = function(data)
    {
        if (!name) {return;}
        name_locked = true;

        app.join_game(data.game_id, remote);
        in_games.push(data.game_id);
    };

    remote.leave_other_games = function(except_game_id)
    {
        for (var i = 0; i < in_games.length; i++)
        {
            if (in_games[i] !== except_game_id)
            {
                app.leave_game(in_games[i], remote);
            }
        }

        in_games = [except_game_id];
    };

    remote.register_handler('set_name', function(data)
    {
        if (!name_locked)
        {
            if (typeof data.name === 'string' && data.name.length >= 4 && data.name.length <= 16)
            {
                if (app.use_name(data.name))
                {
                    app.free_name(name);
                    name = data.name;
                    remote.write({
                        'q': 'set_name',
                        'name': name,
                    });
                }
                else
                {
                    throw new ClientError('Name already in use', 'set_name');
                }
            }
            else
            {
                throw new ClientError('Invalid name', 'set_name');
            }
        }
        else
        {
            throw new ClientError('You cannot change your name right now', 'set_name');
        }
    });

    remote.register_handler('create_game', function(data)
    {
        if (!name) {return;}

        data.game.player_names = [];
        var game = app.create_game(data.game);

        join_game({'game_id': game.get_game_id()});
    });

    remote.register_handler('join_game', join_game);

    remote.register_handler('turn', function(data)
    {
        if (in_games.indexOf(data.game_id) === -1)
        {
            throw new ClientError('You are not in that game');
        }

        app.do_turn(data.game_id, data.actions, remote);
    });

    remote.register_handler('__CLOSE__', function()
    {
        app.unsubscribe_open_games(remote);

        for (var i = 0; i < in_games.length; i++)
        {
            app.leave_game(in_games[i], remote);
        }
    });

    init();
};
