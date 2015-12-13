module.exports = function(app, spark)
{
    var _this = this;

    var handlers = {};

    var send = [];
    var send_timeout;

    var name = 'guest';
    var name_locked = false;
    var in_games = [];

    this.get_name = function() {return name;};

    spark.on('data', function(data)
    {
        if (typeof data === 'object' && typeof data.length === 'number')
        {
            for (var i = 0; i < data.length; i++)
            {
                var obj = data[i];
                if (typeof obj === 'object')
                {
                    var handler = handlers[obj.q];
                    if (typeof handler === 'function')
                    {
                        handler(obj);
                    }
                }
            }
        }
    });

    this.register_handler = function(method, callback)
    {
        handlers[method] = callback;
    };

    this.write = function(data)
    {
        send.push(data);
        if (typeof send_timeout === 'undefined')
        {
            send_timeout = setTimeout(function()
            {
                spark.write(send);
                send = [];
                send_timeout = undefined;
            }, 0);
        }
    };

    this.subscribe = function(public_id)
    {
        _this.write({
            'q': 'subs',
            'id': public_id,
        });
    };

    if (app)
    {
        var join_game = function(data)
        {
            if (!name) {return;}
            name_locked = true;

            app.join_game(data.game_id, _this);
        };

        this.register_handler('set_name', function(data)
        {
            if (!name_locked && typeof data.name === 'string')
            {
                name = data.name;
            }
        });

        this.register_handler('create_game', function(data)
        {
            if (!name) {return;}

            data.game.player_names = [];
            var game = app.create_game(data.game);

            join_game({'game_id': game.get_game_id()});
        });

        this.register_handler('join_game', join_game);

        spark.on('close', function()
        {
            app.unsubscribe_open_games(_this);
        });

        app.subscribe_open_games(_this);
    }
};
