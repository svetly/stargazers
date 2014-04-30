(function() {
  var AsyncComponent, component, port,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  port = require("./Port");

  component = require("./Component");

  AsyncComponent = (function(_super) {
    __extends(AsyncComponent, _super);

    function AsyncComponent(inPortName, outPortName, errPortName) {
      var _this = this;
      this.inPortName = inPortName != null ? inPortName : "in";
      this.outPortName = outPortName != null ? outPortName : "out";
      this.errPortName = errPortName != null ? errPortName : "error";
      if (!this.inPorts[this.inPortName]) {
        throw new Error("no inPort named '" + this.inPortName + "'");
      }
      if (!this.outPorts[this.outPortName]) {
        throw new Error("no outPort named '" + this.outPortName + "'");
      }
      this.load = 0;
      this.q = [];
      this.outPorts.load = new port.Port();
      this.inPorts[this.inPortName].on("begingroup", function(group) {
        if (_this.load > 0) {
          return _this.q.push({
            name: "begingroup",
            data: group
          });
        }
        return _this.outPorts[_this.outPortName].beginGroup(group);
      });
      this.inPorts[this.inPortName].on("endgroup", function() {
        if (_this.load > 0) {
          return _this.q.push({
            name: "endgroup"
          });
        }
        return _this.outPorts[_this.outPortName].endGroup();
      });
      this.inPorts[this.inPortName].on("disconnect", function() {
        if (_this.load > 0) {
          return _this.q.push({
            name: "disconnect"
          });
        }
        _this.outPorts[_this.outPortName].disconnect();
        if (_this.outPorts.load.isAttached()) {
          return _this.outPorts.load.disconnect();
        }
      });
      this.inPorts[this.inPortName].on("data", function(data) {
        if (_this.q.length > 0) {
          return _this.q.push({
            name: "data",
            data: data
          });
        }
        return _this.processData(data);
      });
    }

    AsyncComponent.prototype.processData = function(data) {
      var _this = this;
      this.incrementLoad();
      return this.doAsync(data, function(err) {
        if (err) {
          if (_this.outPorts[_this.errPortName] && _this.outPorts[_this.errPortName].isAttached()) {
            _this.outPorts[_this.errPortName].send(err);
            _this.outPorts[_this.errPortName].disconnect();
          } else {
            throw err;
          }
        }
        return _this.decrementLoad();
      });
    };

    AsyncComponent.prototype.incrementLoad = function() {
      this.load++;
      if (this.outPorts.load.isAttached()) {
        this.outPorts.load.send(this.load);
      }
      if (this.outPorts.load.isAttached()) {
        return this.outPorts.load.disconnect();
      }
    };

    AsyncComponent.prototype.doAsync = function(data, callback) {
      return callback(new Error("AsyncComponents must implement doAsync"));
    };

    AsyncComponent.prototype.decrementLoad = function() {
      var _this = this;
      if (this.load === 0) {
        throw new Error("load cannot be negative");
      }
      this.load--;
      if (this.outPorts.load.isAttached()) {
        this.outPorts.load.send(this.load);
      }
      if (this.outPorts.load.isAttached()) {
        this.outPorts.load.disconnect();
      }
      if (typeof process !== 'undefined' && process.execPath && process.execPath.indexOf('node') !== -1) {
        return process.nextTick(function() {
          return _this.processQueue();
        });
      } else {
        return setTimeout(function() {
          return _this.processQueue();
        }, 0);
      }
    };

    AsyncComponent.prototype.processQueue = function() {
      var event, processedData;
      if (this.load > 0) {
        return;
      }
      processedData = false;
      while (this.q.length > 0) {
        event = this.q[0];
        switch (event.name) {
          case "begingroup":
            if (processedData) {
              return;
            }
            this.outPorts[this.outPortName].beginGroup(event.data);
            this.q.shift();
            break;
          case "endgroup":
            if (processedData) {
              return;
            }
            this.outPorts[this.outPortName].endGroup();
            this.q.shift();
            break;
          case "disconnect":
            if (processedData) {
              return;
            }
            this.outPorts[this.outPortName].disconnect();
            if (this.outPorts.load.isAttached()) {
              this.outPorts.load.disconnect();
            }
            this.q.shift();
            break;
          case "data":
            this.processData(event.data);
            this.q.shift();
            processedData = true;
        }
      }
    };

    return AsyncComponent;

  })(component.Component);

  exports.AsyncComponent = AsyncComponent;

}).call(this);
