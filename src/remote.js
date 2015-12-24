var RemoteServer = require('./remoteserver.js');
var RemoteClient = require('./remoteclient.js');
var ClientError = require('./clienterror.js');

module.exports = function(app, spark)
{
    var _this = this;

    var handlers = {};

    var send = [];
    var send_timeout;

    this.get_spark = function() {return spark;};

    spark.on('data', function(data)
    {
        if (typeof data === 'object' && typeof data.length === 'number')
        {
            for (var i = 0; i < data.length; i++)
            {
                var obj = data[i];
                if (typeof obj === 'object')
                {
                    recv_obj(obj);
                }
            }
        }
    });
    spark.on('end', function()
    {
        recv_obj({'q': '__CLOSE__'});
    });
    var recv_obj = function(obj)
    {
        var handler = handlers[obj.q];
        if (typeof handler !== 'function') {return;}

        try
        {
            handler(obj);
        }
        catch (error)
        {
            if (error instanceof ClientError)
            {
                _this.write({
                    'q': 'error',
                    'msg': error.get_message(),
                });

                var code = error.get_code();
                if (code)
                {
                    _this.write({
                        'q': 'error_' + code,
                        'data': error.get_data(),
                    });
                }
            }
            else
            {
                throw error;
            }
        }
    };

    this.register_handler = function(method, callback)
    {
        handlers[method] = callback;
    };

    this.write = function(data)
    {
        send.push(JSON.parse(JSON.stringify(data)));
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

    if (app)
    {
        new RemoteServer(app, this);
    }
    else
    {
        new RemoteClient(this);
    }

    console.log('new');
};
