// Common Handlebars helpers used across the Witch Iron system
export function registerCommonHandlebarsHelpers() {
  // Register Handlebars helpers with proper block helper format
  Handlebars.registerHelper('range', function(context, options) {
    let output = "";
    const data = Handlebars.createFrame(options.data);
    for (let i = 0; i < context; i++) {
      data.index = i;
      output += options.fn(this, { data: data });
    }
    return output;
  });

  // Add Array constructor helper
  Handlebars.registerHelper('Array', function(n) {
    return [...Array(n).keys()];
  });

  // Add JSON stringify helper for debugging
  Handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context, null, 2);
  });

  // Block helpers for comparison
  Handlebars.registerHelper('eq', function(v1, v2, options) {
    if (!options.fn) return v1 === v2;
    if (v1 === v2) {
      return options.fn(this);
    }
    return options.inverse ? options.inverse(this) : '';
  });

  Handlebars.registerHelper('lt', function(v1, v2, options) {
    if (!options.fn) return v1 < v2;
    if (v1 < v2) {
      return options.fn(this);
    }
    return options.inverse ? options.inverse(this) : '';
  });

  Handlebars.registerHelper('gt', function(v1, v2, options) {
    if (!options.fn) return v1 > v2;
    if (v1 > v2) {
      return options.fn(this);
    }
    return options.inverse ? options.inverse(this) : '';
  });

  Handlebars.registerHelper('le', function(v1, v2, options) {
    if (!options.fn) return v1 <= v2;
    if (v1 <= v2) {
      return options.fn(this);
    }
    return options.inverse ? options.inverse(this) : '';
  });

  Handlebars.registerHelper('ge', function(v1, v2, options) {
    if (!options.fn) return v1 >= v2;
    if (v1 >= v2) {
      return options.fn(this);
    }
    return options.inverse ? options.inverse(this) : '';
  });

  // Ensure gte alias exists for greater than or equal
  Handlebars.registerHelper('gte', function(v1, v2, options) {
    return Handlebars.helpers.ge(v1, v2, options);
  });

  // Simple expression helpers
  Handlebars.registerHelper('add', function(v1, v2) {
    return Number(v1) + Number(v2);
  });

  Handlebars.registerHelper('subtract', function(v1, v2) {
    return Number(v1) - Number(v2);
  });

  Handlebars.registerHelper('multiply', function(v1, v2) {
    return Number(v1) * Number(v2);
  });

  Handlebars.registerHelper('divide', function(v1, v2) {
    return Number(v1) / Number(v2);
  });

  Handlebars.registerHelper('floor', function(v1) {
    return Math.floor(Number(v1));
  });
}
