module.exports = function(message, code, data)
{
    this.get_message = function() {return message;};
    this.get_code = function() {return code;};
    this.get_data = function() {return data;};
};
