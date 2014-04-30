noflo = require 'noflo'

class WriteCsv extends noflo.Component
  constructor: ->
    @inPorts =
      in: new noflo.Port
    @outPorts =
      out: new noflo.Port

    @headers = false

    @inPorts.in.on 'data', (data) =>
      unless @headers
        @outPorts.out.send Object.keys(data).join ','
        @headers = true
      vals = []
      for key, value of data
        vals.push "\"#{value}\""
      @outPorts.out.send vals.join ','

exports.getComponent = -> new WriteCsv
