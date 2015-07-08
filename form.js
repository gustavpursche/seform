const _ = require('lodash');
const Button = require('./button.js');
const Field = require('./field.js');
const path = require('path');
const Promise = require('bluebird');
const Render = require('./render');

var Form = function(instanceOrModel, options) {
  var defaults = {
    action: '',
    method: 'post',
  };

  this.options = _.merge({}, defaults, options);
  this.instanceOrModel = instanceOrModel;

  this.fields = this._constructFields(this.instanceOrModel);
  this.buttons = [];
  this.Render = Render;
  this.template = path.join(__dirname, './template/form.jade');
};

Form.prototype = {
  _isInvalidDate: function(value) {
    return !!value instanceof Date && isNaN(value.toString())
  },

  /* Return the type of a certain sequelize-field */
  _getTypeofSeqField: function(field) {
    return field.type.constructor.key;
  },

  /* Returns the value for a given field */
  _getValueOfSeqField: function(fieldName) {
    var value = '';

    if( this.instanceOrModel.dataValues &&
        this.instanceOrModel.dataValues[ fieldName ] ) {
      value = this.instanceOrModel.dataValues[ fieldName ];
    }

    /* Works around "Invalid Date" Problems */
    if(this._isInvalidDate(value)) {
      return undefined;
    }

    return value;
  },

  /* Returns whether a field was generated by sequelize or by hand */
  _seqFieldIsGenerated: function(field) {
    return !!field._autoGenerated;
  },

  _constructFields: function(instanceOrModel) {
    var fields = [],
        self = this;

    _.forEach(instanceOrModel.rawAttributes, function(seqField, seqFieldName) {
      if(self._seqFieldIsGenerated(seqField)) {
        return;
      }

      var options = {
        value: self._getValueOfSeqField(seqFieldName),
        label: seqFieldName,
        name: seqFieldName,
      };

      if(seqField.validate) {
        options.validate = seqField.validate;
      }

      switch(self._getTypeofSeqField(seqField)) {
        case 'BOOLEAN':
          options.class = 'input';
          options.type = 'checkbox';
          break;

        case 'TEXT':
          options.class = 'textarea';
          break;

        default:
          options.class = 'input';
          options.type = 'text';
      }

      fields.push(new Field(options));
    });

    return fields;
  },

  render: function() {
    var locals = {
          attributes: this.options,
          fields: this.fields || [],
          buttons: this.buttons || [],
        };

    locals.attributes = _.omit(locals.attributes, ['class']);
    return new this.Render(this.template).render(locals);
  },

  validate: function() {
    var errors = {},
        validateField = function(field) {
          return field.validate();
        };

    return Promise.all(_.map(this.fields, validateField))
            .then(function(err) {
              var errObj = {};

              _.forEach(err, function(error) {
                if(!error) {
                  return;
                }

                errObj[error.name] = _.omit(error, ['name']);
              });

              return errObj;
            });
  },
};

module.exports = Form;
