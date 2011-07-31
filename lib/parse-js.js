/**
 * A JavaScript tokenizer / parser / generator, originally written in Lisp.
 * Copyright (c) Marijn Haverbeke <marijnh@gmail.com>
 * http://marijn.haverbeke.nl/parse-js/
 *
 * Ported by to JavaScript by Mihai Bazon
 * Copyright (c) 2010, Mihai Bazon <mihai.bazon@gmail.com>
 * http://mihai.bazon.net/blog/
 *
 * Modifications and adaptions to browser (c) 2011, Juerg Lehni
 * http://lehni.org/
 *
 * Distributed under the BSD license.
 */

var parse_js = new function() {

/* -----[ Tokenizer (constants) ]----- */

var KEYWORDS = array_to_hash([
	"break",
	"case",
	"catch",
	"const",
	"continue",
	"default",
	"delete",
	"do",
	"else",
	"finally",
	"for",
	"function",
	"if",
	"in",
	"instanceof",
	"new",
	"return",
	"switch",
	"throw",
	"try",
	"typeof",
	"var",
	"void",
	"while",
	"with"
]);

var RESERVED_WORDS = array_to_hash([
	"abstract",
	"boolean",
	"byte",
	"char",
	"class",
	"debugger",
	"double",
	"enum",
	"export",
	"extends",
	"final",
	"float",
	"goto",
	"implements",
	"import",
	"int",
	"interface",
	"long",
	"native",
	"package",
	"private",
	"protected",
	"public",
	"short",
	"static",
	"super",
	"synchronized",
	"throws",
	"transient",
	"volatile"
]);

var KEYWORDS_BEFORE_EXPRESSION = array_to_hash([
	"return",
	"new",
	"delete",
	"throw",
	"else",
	"case"
]);

var KEYWORDS_ATOM = array_to_hash([
	"false",
	"null",
	"true",
	"undefined"
]);

var OPERATOR_CHARS = array_to_hash(characters("+-*&%=<>!?|~^"));

var RE_HEX_NUMBER = /^0x[0-9a-f]+$/i;
var RE_OCT_NUMBER = /^0[0-7]+$/;
var RE_DEC_NUMBER = /^\d*\.?\d*(?:e[+-]?\d*(?:\d\.?|\.?\d)\d*)?$/i;

var OPERATORS = array_to_hash([
	"in",
	"instanceof",
	"typeof",
	"new",
	"void",
	"delete",
	"++",
	"--",
	"+",
	"-",
	"!",
	"~",
	"&",
	"|",
	"^",
	"*",
	"/",
	"%",
	">>",
	"<<",
	">>>",
	"<",
	">",
	"<=",
	">=",
	"==",
	"===",
	"!=",
	"!==",
	"?",
	"=",
	"+=",
	"-=",
	"/=",
	"*=",
	"%=",
	">>=",
	"<<=",
	">>>=",
	"|=",
	"^=",
	"&=",
	"&&",
	"||"
]);

var WHITESPACE_CHARS = array_to_hash(characters(" \n\r\t"));

var PUNC_BEFORE_EXPRESSION = array_to_hash(characters("[{}(,.;:"));

var PUNC_CHARS = array_to_hash(characters("[]{}(),;:"));

var REGEXP_MODIFIERS = array_to_hash(characters("gmsiy"));

/* -----[ Tokenizer ]----- */

function is_letter(ch) {
	ch = ch.charCodeAt(0);
	return (ch >= 65 && ch <= 90) ||
		(ch >= 97 && ch <= 122);
};

function is_digit(ch) {
	ch = ch.charCodeAt(0);
	return ch >= 48 && ch <= 57;
};

function is_alphanumeric_char(ch) {
	return is_digit(ch) || is_letter(ch);
};

function is_identifier_start(ch) {
	return ch == "$" || ch == "_" || is_letter(ch);
};

function is_identifier_char(ch) {
	return is_identifier_start(ch) || is_digit(ch);
};

function parse_js_number(num) {
	if (RE_HEX_NUMBER.test(num)) {
		return parseInt(num.substr(2), 16);
	} else if (RE_OCT_NUMBER.test(num)) {
		return parseInt(num.substr(1), 8);
	} else if (RE_DEC_NUMBER.test(num)) {
		return parseFloat(num);
	}
};

function JS_Parse_Error(message, line, col, pos) {
	this.message = message;
	this.line = line;
	this.col = col;
	this.pos = pos;
};

JS_Parse_Error.prototype.toString = function() {
	return this.message + " (line: " + this.line + ", col: " + this.col + ", pos: " + this.pos + ")";
};

function js_error(message, line, col, pos) {
	throw new JS_Parse_Error(message, line, col, pos);
};

function is_token(token, type, val) {
	return token.type == type && (val == null || token.value == val);
};

var EX_EOF = {};

function tokenizer($TEXT) {

	var S = {
		text            : $TEXT.replace(/\r\n?|[\n\u2028\u2029]/g, "\n").replace(/^\uFEFF/, ''),
		pos             : 0,
		tokpos          : 0,
		line            : 0,
		tokline         : 0,
		col             : 0,
		tokcol          : 0,
		newline_before  : false,
		regex_allowed   : false,
		comments_before : []
	};

	function peek() { return S.text.charAt(S.pos); };

	function next(signal_eof) {
		var ch = S.text.charAt(S.pos++);
		if (signal_eof && !ch)
			throw EX_EOF;
		if (ch == "\n") {
			S.newline_before = true;
			++S.line;
			S.col = 0;
		} else {
			++S.col;
		}
		return ch;
	};

	function eof() {
		return !S.peek();
	};

	function find(what, signal_eof) {
		var pos = S.text.indexOf(what, S.pos);
		if (signal_eof && pos == -1) throw EX_EOF;
		return pos;
	};

	function start_token() {
		S.tokline = S.line;
		S.tokcol = S.col;
		S.tokpos = S.pos;
	};

	function token(type, value, is_comment) {
		S.regex_allowed = ((type == "operator" && !HOP(UNARY_POSTFIX, value)) ||
				   (type == "keyword" && HOP(KEYWORDS_BEFORE_EXPRESSION, value)) ||
				   (type == "punc" && HOP(PUNC_BEFORE_EXPRESSION, value)));
		var ret = {
			type  : type,
			value : value,
			line  : S.tokline,
			col   : S.tokcol,
			pos   : S.tokpos,
			nlb   : S.newline_before
		};
		if (!is_comment) {
			ret.comments_before = S.comments_before;
			S.comments_before = [];
		}
		S.newline_before = false;
		return ret;
	};

	function skip_whitespace() {
		while (HOP(WHITESPACE_CHARS, peek()))
			next();
	};

	function read_while(pred) {
		var ret = "", ch = peek(), i = 0;
		while (ch && pred(ch, i++)) {
			ret += next();
			ch = peek();
		}
		return ret;
	};

	function parse_error(err) {
		js_error(err, S.tokline, S.tokcol, S.tokpos);
	};

	function read_num(prefix) {
		var has_e = false, after_e = false, has_x = false, has_dot = prefix == ".";
		var num = read_while(function(ch, i){
			if (ch == "x" || ch == "X") {
				if (has_x) return false;
				return has_x = true;
			}
			if (!has_x && (ch == "E" || ch == "e")) {
				if (has_e) return false;
				return has_e = after_e = true;
			}
			if (ch == "-") {
				if (after_e || (i == 0 && !prefix)) return true;
				return false;
			}
			if (ch == "+") return after_e;
			after_e = false;
			if (ch == ".") {
				if (!has_dot && !has_x)
					return has_dot = true;
				return false;
			}
			return is_alphanumeric_char(ch);
		});
		if (prefix)
			num = prefix + num;
		var valid = parse_js_number(num);
		if (!isNaN(valid)) {
			return token("num", valid);
		} else {
			parse_error("Invalid syntax: " + num);
		}
	};

	function read_escaped_char() {
		var ch = next(true);
		switch (ch) {
			case "n" : return "\n";
			case "r" : return "\r";
			case "t" : return "\t";
			case "b" : return "\b";
			case "v" : return "\v";
			case "f" : return "\f";
			case "0" : return "\0";
			case "x" : return String.fromCharCode(hex_bytes(2));
			case "u" : return String.fromCharCode(hex_bytes(4));
			case "\n": return "";
			default  : return ch;
		}
	};

	function hex_bytes(n) {
		var num = 0;
		for (; n > 0; --n) {
			var digit = parseInt(next(true), 16);
			if (isNaN(digit))
				parse_error("Invalid hex-character pattern in string");
			num = (num << 4) | digit;
		}
		return num;
	};

	function read_string() {
		return with_eof_error("Unterminated string constant", function(){
			var quote = next(), ret = "";
			for (;;) {
				var ch = next(true);
				if (ch == "\\") ch = read_escaped_char();
				else if (ch == quote) break;
				ret += ch;
			}
			return token("string", ret);
		});
	};

	function read_line_comment() {
		next();
		var i = find("\n"), ret;
		if (i == -1) {
			ret = S.text.substr(S.pos);
			S.pos = S.text.length;
		} else {
			ret = S.text.substring(S.pos, i);
			S.pos = i;
		}
		return token("comment1", ret, true);
	};

	function read_multiline_comment() {
		next();
		return with_eof_error("Unterminated multiline comment", function(){
			var i = find("*/", true),
				text = S.text.substring(S.pos, i),
				tok = token("comment2", text, true);
			S.pos = i + 2;
			S.line += text.split("\n").length - 1;
			S.newline_before = text.indexOf("\n") >= 0;
			return tok;
		});
	};

	function read_regexp() {
		return with_eof_error("Unterminated regular expression", function(){
			var prev_backslash = false, regexp = "", ch, in_class = false;
			while ((ch = next(true))) if (prev_backslash) {
				regexp += "\\" + ch;
				prev_backslash = false;
			} else if (ch == "[") {
				in_class = true;
				regexp += ch;
			} else if (ch == "]" && in_class) {
				in_class = false;
				regexp += ch;
			} else if (ch == "/" && !in_class) {
				break;
			} else if (ch == "\\") {
				prev_backslash = true;
			} else {
				regexp += ch;
			}
			var mods = read_while(function(ch){
				return HOP(REGEXP_MODIFIERS, ch);
			});
			return token("regexp", [ regexp, mods ]);
		});
	};

	function read_operator(prefix) {
		function grow(op) {
			if (!peek()) return op;
			var bigger = op + peek();
			if (HOP(OPERATORS, bigger)) {
				next();
				return grow(bigger);
			} else {
				return op;
			}
		};
		return token("operator", grow(prefix || next()));
	};

	function handle_slash() {
		next();
		var regex_allowed = S.regex_allowed;
		switch (peek()) {
			case "/":
			S.comments_before.push(read_line_comment());
			S.regex_allowed = regex_allowed;
			return next_token();
			case "*":
			S.comments_before.push(read_multiline_comment());
			S.regex_allowed = regex_allowed;
			return next_token();
		}
		return S.regex_allowed ? read_regexp() : read_operator("/");
	};

	function handle_dot() {
		next();
		return is_digit(peek())
			? read_num(".")
			: token("punc", ".");
	};

	function read_word() {
		var word = read_while(is_identifier_char);
		return !HOP(KEYWORDS, word)
			? token("name", word)
			: HOP(OPERATORS, word)
			? token("operator", word)
			: HOP(KEYWORDS_ATOM, word)
			? token("atom", word)
			: token("keyword", word);
	};

	function with_eof_error(eof_error, cont) {
		try {
			return cont();
		} catch(ex) {
			if (ex === EX_EOF) parse_error(eof_error);
			else throw ex;
		}
	};

	function next_token(force_regexp) {
		if (force_regexp)
			return read_regexp();
		skip_whitespace();
		start_token();
		var ch = peek();
		if (!ch) return token("eof");
		if (is_digit(ch)) return read_num();
		if (ch == '"' || ch == "'") return read_string();
		if (HOP(PUNC_CHARS, ch)) return token("punc", next());
		if (ch == ".") return handle_dot();
		if (ch == "/") return handle_slash();
		if (HOP(OPERATOR_CHARS, ch)) return read_operator();
		if (ch == "\\" || is_identifier_start(ch)) return read_word();
		parse_error("Unexpected character '" + ch + "'");
	};

	next_token.context = function(nc) {
		if (nc) S = nc;
		return S;
	};

	return next_token;

};

/* -----[ Parser (constants) ]----- */

var UNARY_PREFIX = array_to_hash([
	"typeof",
	"void",
	"delete",
	"--",
	"++",
	"!",
	"~",
	"-",
	"+"
]);

var UNARY_POSTFIX = array_to_hash([ "--", "++" ]);

var ASSIGNMENT = (function(a, ret, i){
	while (i < a.length) {
		ret[a[i]] = a[i].substr(0, a[i].length - 1);
		i++;
	}
	return ret;
})(
	["+=", "-=", "/=", "*=", "%=", ">>=", "<<=", ">>>=", "|=", "^=", "&="],
	{ "=": true },
	0
);

var PRECEDENCE = (function(a, ret){
	for (var i = 0, n = 1; i < a.length; ++i, ++n) {
		var b = a[i];
		for (var j = 0; j < b.length; ++j) {
			ret[b[j]] = n;
		}
	}
	return ret;
})(
	[
		["||"],
		["&&"],
		["|"],
		["^"],
		["&"],
		["==", "===", "!=", "!=="],
		["<", ">", "<=", ">=", "in", "instanceof"],
		[">>", "<<", ">>>"],
		["+", "-"],
		["*", "/", "%"]
	],
	{}
);

var STATEMENTS_WITH_LABELS = array_to_hash([ "for", "do", "while", "switch" ]);

var ATOMIC_START_TOKEN = array_to_hash([ "atom", "num", "string", "regexp", "name" ]);

/* -----[ Parser ]----- */

function NodeWithToken(str, start, end) {
	this.name = str;
	this.start = start;
	this.end = end;
};

NodeWithToken.prototype.toString = function() { return this.name; };

function parse($TEXT, exigent_mode, embed_tokens) {

	var S = {
		input       : typeof $TEXT == "string" ? tokenizer($TEXT, true) : $TEXT,
		token       : null,
		prev        : null,
		peeked      : null,
		in_function : 0,
		in_loop     : 0,
		labels      : []
	};

	S.token = next();

	function is(type, value) {
		return is_token(S.token, type, value);
	};

	function peek() { return S.peeked || (S.peeked = S.input()); };

	function next() {
		S.prev = S.token;
		if (S.peeked) {
			S.token = S.peeked;
			S.peeked = null;
		} else {
			S.token = S.input();
		}
		return S.token;
	};

	function prev() {
		return S.prev;
	};

	function croak(msg, line, col, pos) {
		var ctx = S.input.context();
		js_error(msg,
			 line != null ? line : ctx.tokline,
			 col != null ? col : ctx.tokcol,
			 pos != null ? pos : ctx.tokpos);
	};

	function token_error(token, msg) {
		croak(msg, token.line, token.col);
	};

	function unexpected(token) {
		if (token == null)
			token = S.token;
		token_error(token, "Unexpected token: " + token.type + " (" + token.value + ")");
	};

	function expect_token(type, val) {
		if (is(type, val)) {
			return next();
		}
		token_error(S.token, "Unexpected token " + S.token.type + ", expected " + type);
	};

	function expect(punc) { return expect_token("punc", punc); };

	function can_insert_semicolon() {
		return !exigent_mode && (
			S.token.nlb || is("eof") || is("punc", "}")
		);
	};

	function semicolon() {
		if (is("punc", ";")) next();
		else if (!can_insert_semicolon()) unexpected();
	};

	function as() {
		return slice(arguments);
	};

	function parenthesised() {
		expect("(");
		var ex = expression();
		expect(")");
		return ex;
	};

	function add_tokens(str, start, end) {
		return str instanceof NodeWithToken ? str : new NodeWithToken(str, start, end);
	};

	function maybe_embed_tokens(parser) {
		if (embed_tokens) return function() {
			var start = S.token;
			var ast = parser.apply(this, arguments);
			ast[0] = add_tokens(ast[0], start, prev());
			return ast;
		};
		else return parser;
	};

	var statement = maybe_embed_tokens(function() {
		if (is("operator", "/")) {
			S.peeked = null;
			S.token = S.input(true); // force regexp
		}
		switch (S.token.type) {
			case "num":
			case "string":
			case "regexp":
			case "operator":
			case "atom":
			return simple_statement();

			case "name":
			return is_token(peek(), "punc", ":")
				? labeled_statement(prog1(S.token.value, next, next))
				: simple_statement();

			case "punc":
			switch (S.token.value) {
				case "{":
				return as("block", block_());
				case "[":
				case "(":
				return simple_statement();
				case ";":
				next();
				return as("block");
				default:
				unexpected();
			}

			case "keyword":
			switch (prog1(S.token.value, next)) {
				case "break":
				return break_cont("break");

				case "continue":
				return break_cont("continue");

				case "debugger":
				semicolon();
				return as("debugger");

				case "do":
				return (function(body){
					expect_token("keyword", "while");
					return as("do", prog1(parenthesised, semicolon), body);
				})(in_loop(statement));

				case "for":
				return for_();

				case "function":
				return function_(true);

				case "if":
				return if_();

				case "return":
				if (S.in_function == 0)
					croak("'return' outside of function");
				return as("return",
					  is("punc", ";")
					  ? (next(), null)
					  : can_insert_semicolon()
					  ? null
					  : prog1(expression, semicolon));

				case "switch":
				return as("switch", parenthesised(), switch_block_());

				case "throw":
				return as("throw", prog1(expression, semicolon));

				case "try":
				return try_();

				case "var":
				return prog1(var_, semicolon);

				case "const":
				return prog1(const_, semicolon);

				case "while":
				return as("while", parenthesised(), in_loop(statement));

				case "with":
				return as("with", parenthesised(), statement());

				default:
				unexpected();
			}
		}
	});

	function labeled_statement(label) {
		S.labels.push(label);
		var start = S.token, stat = statement();
		if (exigent_mode && !HOP(STATEMENTS_WITH_LABELS, stat[0]))
			unexpected(start);
		S.labels.pop();
		return as("label", label, stat);
	};

	function simple_statement() {
		return as("stat", prog1(expression, semicolon));
	};

	function break_cont(type) {
		var name;
		if (!can_insert_semicolon()) {
			name = is("name") ? S.token.value : null;
		}
		if (name != null) {
			next();
			if (!member(name, S.labels))
				croak("Label " + name + " without matching loop or statement");
		}
		else if (S.in_loop == 0)
			croak(type + " not inside a loop or switch");
		semicolon();
		return as(type, name);
	};

	function for_() {
		expect("(");
		var init = null;
		if (!is("punc", ";")) {
			init = is("keyword", "var")
				? (next(), var_(true))
				: expression(true, true);
			if (is("operator", "in"))
				return for_in(init);
		}
		return regular_for(init);
	};

	function regular_for(init) {
		expect(";");
		var test = is("punc", ";") ? null : expression();
		expect(";");
		var step = is("punc", ")") ? null : expression();
		expect(")");
		return as("for", init, test, step, in_loop(statement));
	};

	function for_in(init) {
		var lhs = init[0] == "var" ? as("name", init[1][0]) : init;
		next();
		var obj = expression();
		expect(")");
		return as("for-in", init, lhs, obj, in_loop(statement));
	};

	var function_ = maybe_embed_tokens(function(in_statement) {
		var name = is("name") ? prog1(S.token.value, next) : null;
		if (in_statement && !name)
			unexpected();
		expect("(");
		return as(in_statement ? "defun" : "function",
			  name,
			  // arguments
			  (function(first, a){
				  while (!is("punc", ")")) {
					  if (first) first = false; else expect(",");
					  if (!is("name")) unexpected();
					  a.push(S.token.value);
					  next();
				  }
				  next();
				  return a;
			  })(true, []),
			  // body
			  (function(){
				  ++S.in_function;
				  var loop = S.in_loop;
				  S.in_loop = 0;
				  var a = block_();
				  --S.in_function;
				  S.in_loop = loop;
				  return a;
			  })());
	});

	function if_() {
		var cond = parenthesised(), body = statement(), belse;
		if (is("keyword", "else")) {
			next();
			belse = statement();
		}
		return as("if", cond, body, belse);
	};

	function block_() {
		expect("{");
		var a = [];
		while (!is("punc", "}")) {
			if (is("eof")) unexpected();
			a.push(statement());
		}
		next();
		return a;
	};

	var switch_block_ = curry(in_loop, function(){
		expect("{");
		var a = [], cur = null;
		while (!is("punc", "}")) {
			if (is("eof")) unexpected();
			if (is("keyword", "case")) {
				next();
				cur = [];
				a.push([ expression(), cur ]);
				expect(":");
			}
			else if (is("keyword", "default")) {
				next();
				expect(":");
				cur = [];
				a.push([ null, cur ]);
			}
			else {
				if (!cur) unexpected();
				cur.push(statement());
			}
		}
		next();
		return a;
	});

	function try_() {
		var body = block_(), bcatch, bfinally;
		if (is("keyword", "catch")) {
			next();
			expect("(");
			if (!is("name"))
				croak("Name expected");
			var name = S.token.value;
			next();
			expect(")");
			bcatch = [ name, block_() ];
		}
		if (is("keyword", "finally")) {
			next();
			bfinally = block_();
		}
		if (!bcatch && !bfinally)
			croak("Missing catch/finally blocks");
		return as("try", body, bcatch, bfinally);
	};

	function vardefs(no_in) {
		var a = [];
		for (;;) {
			if (!is("name"))
				unexpected();
			var name = S.token.value;
			next();
			if (is("operator", "=")) {
				next();
				a.push([ name, expression(false, no_in) ]);
			} else {
				a.push([ name ]);
			}
			if (!is("punc", ","))
				break;
			next();
		}
		return a;
	};

	function var_(no_in) {
		return as("var", vardefs(no_in));
	};

	function const_() {
		return as("const", vardefs());
	};

	function new_() {
		var newexp = expr_atom(false), args;
		if (is("punc", "(")) {
			next();
			args = expr_list(")");
		} else {
			args = [];
		}
		return subscripts(as("new", newexp, args), true);
	};

	var expr_atom = maybe_embed_tokens(function(allow_calls) {
		if (is("operator", "new")) {
			next();
			return new_();
		}
		if (is("operator") && HOP(UNARY_PREFIX, S.token.value)) {
			return make_unary("unary-prefix",
					  prog1(S.token.value, next),
					  expr_atom(allow_calls));
		}
		if (is("punc")) {
			switch (S.token.value) {
				case "(":
				next();
				return subscripts(prog1(expression, curry(expect, ")")), allow_calls);
				case "[":
				next();
				return subscripts(array_(), allow_calls);
				case "{":
				next();
				return subscripts(object_(), allow_calls);
			}
			unexpected();
		}
		if (is("keyword", "function")) {
			next();
			return subscripts(function_(false), allow_calls);
		}
		if (HOP(ATOMIC_START_TOKEN, S.token.type)) {
			var atom = S.token.type == "regexp"
				? as("regexp", S.token.value[0], S.token.value[1])
				: as(S.token.type, S.token.value);
			return subscripts(prog1(atom, next), allow_calls);
		}
		unexpected();
	});

	function expr_list(closing, allow_trailing_comma, allow_empty) {
		var first = true, a = [];
		while (!is("punc", closing)) {
			if (first) first = false; else expect(",");
			if (allow_trailing_comma && is("punc", closing)) break;
			if (is("punc", ",") && allow_empty) {
				a.push([ "atom", "undefined" ]);
			} else {
				a.push(expression(false));
			}
		}
		next();
		return a;
	};

	function array_() {
		return as("array", expr_list("]", !exigent_mode, true));
	};

	function object_() {
		var first = true, a = [];
		while (!is("punc", "}")) {
			if (first) first = false; else expect(",");
			if (!exigent_mode && is("punc", "}"))
				// allow trailing comma
				break;
			var type = S.token.type;
			var name = as_property_name();
			if (type == "name" && (name == "get" || name == "set") && !is("punc", ":")) {
				a.push([ as_name(), function_(false), name ]);
			} else {
				expect(":");
				a.push([ name, expression(false) ]);
			}
		}
		next();
		return as("object", a);
	};

	function as_property_name() {
		switch (S.token.type) {
			case "num":
			case "string":
			return prog1(S.token.value, next);
		}
		return as_name();
	};

	function as_name() {
		switch (S.token.type) {
			case "name":
			case "operator":
			case "keyword":
			case "atom":
			return prog1(S.token.value, next);
			default:
			unexpected();
		}
	};

	function subscripts(expr, allow_calls) {
		if (is("punc", ".")) {
			next();
			return subscripts(as("dot", expr, as_name()), allow_calls);
		}
		if (is("punc", "[")) {
			next();
			return subscripts(as("sub", expr, prog1(expression, curry(expect, "]"))), allow_calls);
		}
		if (allow_calls && is("punc", "(")) {
			next();
			return subscripts(as("call", expr, expr_list(")")), true);
		}
		if (allow_calls && is("operator") && HOP(UNARY_POSTFIX, S.token.value)) {
			return prog1(curry(make_unary, "unary-postfix", S.token.value, expr),
					next);
		}
		return expr;
	};

	function make_unary(tag, op, expr) {
		if ((op == "++" || op == "--") && !is_assignable(expr))
			croak("Invalid use of " + op + " operator");
		return as(tag, op, expr);
	};

	function expr_op(left, min_prec, no_in) {
		var op = is("operator") ? S.token.value : null;
		if (op && op == "in" && no_in) op = null;
		var prec = op != null ? PRECEDENCE[op] : null;
		if (prec != null && prec > min_prec) {
			next();
			var right = expr_op(expr_atom(true), prec, no_in);
			return expr_op(as("binary", op, left, right), min_prec, no_in);
		}
		return left;
	};

	function expr_ops(no_in) {
		return expr_op(expr_atom(true), 0, no_in);
	};

	function maybe_conditional(no_in) {
		var expr = expr_ops(no_in);
		if (is("operator", "?")) {
			next();
			var yes = expression(false);
			expect(":");
			return as("conditional", expr, yes, expression(false, no_in));
		}
		return expr;
	};

	function is_assignable(expr) {
		if (!exigent_mode) return true;
		switch (expr[0]) {
			case "dot":
			case "sub":
			case "new":
			case "call":
			return true;
			case "name":
			return expr[1] != "this";
		}
	};

	function maybe_assign(no_in) {
		var left = maybe_conditional(no_in), val = S.token.value;
		if (is("operator") && HOP(ASSIGNMENT, val)) {
			if (is_assignable(left)) {
				next();
				return as("assign", ASSIGNMENT[val], left, maybe_assign(no_in));
			}
			croak("Invalid assignment");
		}
		return left;
	};

	var expression = maybe_embed_tokens(function(commas, no_in) {
		if (arguments.length == 0)
			commas = true;
		var expr = maybe_assign(no_in);
		if (commas && is("punc", ",")) {
			next();
			return as("seq", expr, expression(true, no_in));
		}
		return expr;
	});

	function in_loop(cont) {
		try {
			++S.in_loop;
			return cont();
		} finally {
			--S.in_loop;
		}
	};

	return as("toplevel", (function(a){
		while (!is("eof"))
			a.push(statement());
		return a;
	})([]));

};

/* -----[ Utilities ]----- */

function curry(f) {
	var args = slice(arguments, 1);
	return function() { return f.apply(this, args.concat(slice(arguments))); };
};

function prog1(ret) {
	if (ret instanceof Function)
		ret = ret();
	for (var i = 1, n = arguments.length; --n > 0; ++i)
		arguments[i]();
	return ret;
};

function array_to_hash(a) {
	var ret = {};
	for (var i = 0; i < a.length; ++i)
		ret[a[i]] = true;
	return ret;
};

function slice(a, start) {
	return Array.prototype.slice.call(a, start || 0);
};

function characters(str) {
	return str.split("");
};

function member(name, array) {
	for (var i = array.length; --i >= 0;)
		if (array[i] === name)
			return true;
	return false;
};

function HOP(obj, prop) {
	return Object.prototype.hasOwnProperty.call(obj, prop);
};

/* -----[ helper for AST traversal ]----- */

function ast_walker() {
	function _vardefs(defs) {
		return [ this[0], MAP(defs, function(def){
			var a = [ def[0] ];
			if (def.length > 1)
				a[1] = walk(def[1]);
			return a;
		}) ];
	};
	function _block(statements) {
		var out = [ this[0] ];
		if (statements != null)
			out.push(MAP(statements, walk));
		return out;
	};
	var walkers = {
		"string": function(str) {
			return [ this[0], str ];
		},
		"num": function(num) {
			return [ this[0], num ];
		},
		"name": function(name) {
			return [ this[0], name ];
		},
		"toplevel": function(statements) {
			return [ this[0], MAP(statements, walk) ];
		},
		"block": _block,
		"splice": _block,
		"var": _vardefs,
		"const": _vardefs,
		"try": function(t, c, f) {
			return [
				this[0],
				MAP(t, walk),
				c != null ? [ c[0], MAP(c[1], walk) ] : null,
				f != null ? MAP(f, walk) : null
			];
		},
		"throw": function(expr) {
			return [ this[0], walk(expr) ];
		},
		"new": function(ctor, args) {
			return [ this[0], walk(ctor), MAP(args, walk) ];
		},
		"switch": function(expr, body) {
			return [ this[0], walk(expr), MAP(body, function(branch){
				return [ branch[0] ? walk(branch[0]) : null,
					 MAP(branch[1], walk) ];
			}) ];
		},
		"break": function(label) {
			return [ this[0], label ];
		},
		"continue": function(label) {
			return [ this[0], label ];
		},
		"conditional": function(cond, t, e) {
			return [ this[0], walk(cond), walk(t), walk(e) ];
		},
		"assign": function(op, lvalue, rvalue) {
			return [ this[0], op, walk(lvalue), walk(rvalue) ];
		},
		"dot": function(expr) {
			return [ this[0], walk(expr) ].concat(slice(arguments, 1));
		},
		"call": function(expr, args) {
			return [ this[0], walk(expr), MAP(args, walk) ];
		},
		"function": function(name, args, body) {
			return [ this[0], name, args.slice(), MAP(body, walk) ];
		},
		"defun": function(name, args, body) {
			return [ this[0], name, args.slice(), MAP(body, walk) ];
		},
		"if": function(conditional, t, e) {
			return [ this[0], walk(conditional), walk(t), walk(e) ];
		},
		"for": function(init, cond, step, block) {
			return [ this[0], walk(init), walk(cond), walk(step), walk(block) ];
		},
		"for-in": function(vvar, key, hash, block) {
			return [ this[0], walk(vvar), walk(key), walk(hash), walk(block) ];
		},
		"while": function(cond, block) {
			return [ this[0], walk(cond), walk(block) ];
		},
		"do": function(cond, block) {
			return [ this[0], walk(cond), walk(block) ];
		},
		"return": function(expr) {
			return [ this[0], walk(expr) ];
		},
		"binary": function(op, left, right) {
			return [ this[0], op, walk(left), walk(right) ];
		},
		"unary-prefix": function(op, expr) {
			return [ this[0], op, walk(expr) ];
		},
		"unary-postfix": function(op, expr) {
			return [ this[0], op, walk(expr) ];
		},
		"sub": function(expr, subscript) {
			return [ this[0], walk(expr), walk(subscript) ];
		},
		"object": function(props) {
			return [ this[0], MAP(props, function(p){
				return p.length == 2
					? [ p[0], walk(p[1]) ]
					: [ p[0], walk(p[1]), p[2] ]; // get/set-ter
			}) ];
		},
		"regexp": function(rx, mods) {
			return [ this[0], rx, mods ];
		},
		"array": function(elements) {
			return [ this[0], MAP(elements, walk) ];
		},
		"stat": function(stat) {
			return [ this[0], walk(stat) ];
		},
		"seq": function() {
			return [ this[0] ].concat(MAP(slice(arguments), walk));
		},
		"label": function(name, block) {
			return [ this[0], name, walk(block) ];
		},
		"with": function(expr, block) {
			return [ this[0], walk(expr), walk(block) ];
		},
		"atom": function(name) {
			return [ this[0], name ];
		}
	};

	var user = {};
	var stack = [];
	function walk(ast) {
		if (ast == null)
			return null;
		try {
			stack.push(ast);
			var type = ast[0];
			var gen = user[type];
			if (gen) {
				var ret = gen.apply(ast, ast.slice(1));
				if (ret != null)
					return ret;
			}
			gen = walkers[type];
			return gen.apply(ast, ast.slice(1));
		} finally {
			stack.pop();
		}
	};

	function with_walkers(walkers, cont){
		var save = {}, i;
		for (i in walkers) if (HOP(walkers, i)) {
			save[i] = user[i];
			user[i] = walkers[i];
		}
		var ret = cont();
		for (i in save) if (HOP(save, i)) {
			if (!save[i]) delete user[i];
			else user[i] = save[i];
		}
		return ret;
	};

	return {
		walk: walk,
		with_walkers: with_walkers,
		parent: function() {
			return stack[stack.length - 2]; // last one is current node
		},
		stack: function() {
			return stack;
		}
	};
};

function empty(b) {
	return !b || (b[0] == "block" && (!b[1] || b[1].length == 0));
};

/* -----[ re-generate code from the AST ]----- */

var DOT_CALL_NO_PARENS = array_to_hash([
	"name",
	"array",
	"object",
	"string",
	"dot",
	"sub",
	"call",
	"regexp"
]);

function make_string(str) {
	var dq = 0, sq = 0;
	str = str.replace(/[\\\b\f\n\r\t\x22\x27]/g, function(s){
		switch (s) {
			case "\\": return "\\\\";
			case "\b": return "\\b";
			case "\f": return "\\f";
			case "\n": return "\\n";
			case "\r": return "\\r";
			case "\t": return "\\t";
			case '"': ++dq; return '"';
			case "'": ++sq; return "'";
		}
		return s;
	});
	if (dq > sq) return "'" + str.replace(/\x27/g, "\\'") + "'";
	else return '"' + str.replace(/\x22/g, '\\"') + '"';
};

var SPLICE_NEEDS_BRACKETS = array_to_hash([ "if", "while", "do", "for", "for-in", "with" ]);

function gen_code(ast, options) {
	options = defaults(options, {
		indent_start : 0,
		indent_level : 4,
		quote_keys   : false,
		space_colon  : false,
		beautify	 : false
	});
	var beautify = !!options.beautify;
	var indentation = 0,
		newline = beautify ? "\n" : "",
		space = beautify ? " " : "";

	function make_name(name) {
		return name.toString();
	};

	function indent(line) {
		if (line == null)
			line = "";
		if (beautify)
			line = repeat_string(" ", options.indent_start + indentation * options.indent_level) + line;
		return line;
	};

	function with_indent(cont, incr) {
		if (incr == null) incr = 1;
		indentation += incr;
		try { return cont.apply(null, slice(arguments, 1)); }
		finally { indentation -= incr; }
	};

	function add_spaces(a) {
		if (beautify)
			return a.join(" ");
		var b = [];
		for (var i = 0; i < a.length; ++i) {
			var next = a[i + 1];
			b.push(a[i]);
			if (next &&
				((/[a-z0-9_\x24]$/i.test(a[i].toString()) && /^[a-z0-9_\x24]/i.test(next.toString())) ||
				 (/[\+\-]$/.test(a[i].toString()) && /^[\+\-]/.test(next.toString())))) {
				b.push(" ");
			}
		}
		return b.join("");
	};

	function add_commas(a) {
		return a.join("," + space);
	};

	function parenthesize(expr) {
		var gen = make(expr);
		for (var i = 1; i < arguments.length; ++i) {
			var el = arguments[i];
			if ((el instanceof Function && el(expr)) || expr[0] == el)
				return "(" + gen + ")";
		}
		return gen;
	};

	function best_of(a) {
		if (a.length == 1) {
			return a[0];
		}
		if (a.length == 2) {
			var b = a[1];
			a = a[0];
			return a.length <= b.length ? a : b;
		}
		return best_of([ a[0], best_of(a.slice(1)) ]);
	};

	function needs_parens(expr) {
		if (expr[0] == "function" || expr[0] == "object") {
			// dot/call on a literal function requires the
			// function literal itself to be parenthesized
			// only if it's the first "thing" in a
			// statement.  This means that the parent is
			// "stat", but it could also be a "seq" and
			// we're the first in this "seq" and the
			// parent is "stat", and so on.  Messy stuff,
			// but it worths the trouble.
			var a = slice($stack), self = a.pop(), p = a.pop();
			while (p) {
				if (p[0] == "stat") return true;
				if (((p[0] == "seq" || p[0] == "call" || p[0] == "dot" || p[0] == "sub" || p[0] == "conditional") && p[1] === self) ||
					((p[0] == "binary" || p[0] == "assign" || p[0] == "unary-postfix") && p[2] === self)) {
					self = p;
					p = a.pop();
				} else {
					return false;
				}
			}
		}
		return !HOP(DOT_CALL_NO_PARENS, expr[0]);
	};

	function make_num(num) {
		var str = num.toString(10), a = [ str.replace(/^0\./, ".") ], m;
		if (Math.floor(num) === num) {
			a.push("0x" + num.toString(16).toLowerCase(), // probably pointless
				   "0" + num.toString(8)); // same.
			if ((m = /^(.*?)(0+)$/.exec(num))) {
				a.push(m[1] + "e" + m[2].length);
			}
		} else if ((m = /^0?\.(0+)(.*)$/.exec(num))) {
			a.push(m[2] + "e-" + (m[1].length + m[2].length),
				   str.substr(str.indexOf(".")));
		}
		return best_of(a);
	};

	var generators = {
		"string": make_string,
		"num": make_num,
		"name": make_name,
		"toplevel": function(statements) {
			return make_block_statements(statements)
				.join(newline);
		},
		"splice": function(statements) {
			var parent = $stack[$stack.length - 2][0];
			if (HOP(SPLICE_NEEDS_BRACKETS, parent)) {
				// we need block brackets in this case
				return make_block.apply(this, arguments);
			} else {
				return MAP(make_block_statements(statements, true),
					   function(line, i) {
						   // the first line is already indented
						   return i > 0 ? indent(line) : line;
					   }).join(newline);
			}
		},
		"block": make_block,
		"var": function(defs) {
			return "var " + add_commas(MAP(defs, make_1vardef)) + ";";
		},
		"const": function(defs) {
			return "const " + add_commas(MAP(defs, make_1vardef)) + ";";
		},
		"try": function(tr, ca, fi) {
			var out = [ "try", make_block(tr) ];
			if (ca) out.push("catch", "(" + ca[0] + ")", make_block(ca[1]));
			if (fi) out.push("finally", make_block(fi));
			return add_spaces(out);
		},
		"throw": function(expr) {
			return add_spaces([ "throw", make(expr) ]) + ";";
		},
		"new": function(ctor, args) {
			args = args.length > 0 ? "(" + add_commas(MAP(args, make)) + ")" : "";
			return add_spaces([ "new", parenthesize(ctor, "seq", "binary", "conditional", "assign", function(expr){
				var w = ast_walker(), has_call = {};
				try {
					w.with_walkers({
						"call": function() { throw has_call },
						"function": function() { return this }
					}, function(){
						w.walk(expr);
					});
				} catch(ex) {
					if (ex === has_call)
						return true;
					throw ex;
				}
			}) + args ]);
		},
		"switch": function(expr, body) {
			return add_spaces([ "switch", "(" + make(expr) + ")", make_switch_block(body) ]);
		},
		"break": function(label) {
			var out = "break";
			if (label != null)
				out += " " + make_name(label);
			return out + ";";
		},
		"continue": function(label) {
			var out = "continue";
			if (label != null)
				out += " " + make_name(label);
			return out + ";";
		},
		"conditional": function(co, th, el) {
			return add_spaces([ parenthesize(co, "assign", "seq", "conditional"), "?",
						parenthesize(th, "seq"), ":",
						parenthesize(el, "seq") ]);
		},
		"assign": function(op, lvalue, rvalue) {
			if (op && op !== true) op += "=";
			else op = "=";
			return add_spaces([ make(lvalue), op, parenthesize(rvalue, "seq") ]);
		},
		"dot": function(expr) {
			var out = make(expr), i = 1;
			if (expr[0] == "num") {
				if (!/\./.test(expr[1]))
					out += ".";
			} else if (needs_parens(expr))
				out = "(" + out + ")";
			while (i < arguments.length)
				out += "." + make_name(arguments[i++]);
			return out;
		},
		"call": function(func, args) {
			var f = make(func);
			if (needs_parens(func))
				f = "(" + f + ")";
			return f + "(" + add_commas(MAP(args, function(expr){
				return parenthesize(expr, "seq");
			})) + ")";
		},
		"function": make_function,
		"defun": make_function,
		"if": function(co, th, el) {
			var out = [ "if", "(" + make(co) + ")", el ? make_then(th) : make(th) ];
			if (el) {
				out.push("else", make(el));
			}
			return add_spaces(out);
		},
		"for": function(init, cond, step, block) {
			var out = [ "for" ];
			init = (init != null ? make(init) : "").replace(/;*\s*$/, ";" + space);
			cond = (cond != null ? make(cond) : "").replace(/;*\s*$/, ";" + space);
			step = (step != null ? make(step) : "").replace(/;*\s*$/, "");
			var args = init + cond + step;
			if (args == "; ; ") args = ";;";
			out.push("(" + args + ")", make(block));
			return add_spaces(out);
		},
		"for-in": function(vvar, key, hash, block) {
			return add_spaces([ "for", "(" +
						(vvar ? make(vvar).replace(/;+$/, "") : make(key)),
						"in",
						make(hash) + ")", make(block) ]);
		},
		"while": function(condition, block) {
			return add_spaces([ "while", "(" + make(condition) + ")", make(block) ]);
		},
		"do": function(condition, block) {
			return add_spaces([ "do", make(block), "while", "(" + make(condition) + ")" ]) + ";";
		},
		"return": function(expr) {
			var out = [ "return" ];
			if (expr != null) out.push(make(expr));
			return add_spaces(out) + ";";
		},
		"binary": function(operator, lvalue, rvalue) {
			var left = make(lvalue), right = make(rvalue);
			// XXX: I'm pretty sure other cases will bite here.
			//	  we need to be smarter.
			//	  adding parens all the time is the safest bet.
			if (member(lvalue[0], [ "assign", "conditional", "seq" ]) ||
				lvalue[0] == "binary" && PRECEDENCE[operator] > PRECEDENCE[lvalue[1]]) {
				left = "(" + left + ")";
			}
			if (member(rvalue[0], [ "assign", "conditional", "seq" ]) ||
				rvalue[0] == "binary" && PRECEDENCE[operator] >= PRECEDENCE[rvalue[1]] &&
				!(rvalue[1] == operator && member(operator, [ "&&", "||", "*" ]))) {
				right = "(" + right + ")";
			}
			return add_spaces([ left, operator, right ]);
		},
		"unary-prefix": function(operator, expr) {
			var val = make(expr);
			if (!(expr[0] == "num" || (expr[0] == "unary-prefix" && !HOP(OPERATORS, operator + expr[1])) || !needs_parens(expr)))
				val = "(" + val + ")";
			return operator + (is_alphanumeric_char(operator.charAt(0)) ? " " : "") + val;
		},
		"unary-postfix": function(operator, expr) {
			var val = make(expr);
			if (!(expr[0] == "num" || (expr[0] == "unary-postfix" && !HOP(OPERATORS, operator + expr[1])) || !needs_parens(expr)))
				val = "(" + val + ")";
			return val + operator;
		},
		"sub": function(expr, subscript) {
			var hash = make(expr);
			if (needs_parens(expr))
				hash = "(" + hash + ")";
			return hash + "[" + make(subscript) + "]";
		},
		"object": function(props) {
			if (props.length == 0)
				return "{}";
			return "{" + newline + with_indent(function(){
				return MAP(props, function(p){
					if (p.length == 3) {
						// getter/setter.  The name is in p[0], the arg.list in p[1][2], the
						// body in p[1][3] and type ("get" / "set") in p[2].
						return indent(make_function(p[0], p[1][2], p[1][3], p[2]));
					}
					var key = p[0], val = make(p[1]);
					if (options.quote_keys) {
						key = make_string(key);
					} else if ((typeof key == "number" || !beautify && +key + "" == key)
						   && parseFloat(key) >= 0) {
						key = make_num(+key);
					} else if (!is_identifier(key)) {
						key = make_string(key);
					}
					return indent(add_spaces(beautify && options.space_colon
								 ? [ key, ":", val ]
								 : [ key + ":", val ]));
				}).join("," + newline);
			}) + newline + indent("}");
		},
		"regexp": function(rx, mods) {
			return "/" + rx + "/" + mods;
		},
		"array": function(elements) {
			if (elements.length == 0) return "[]";
			return add_spaces([ "[", add_commas(MAP(elements, function(el){
				if (!beautify && el[0] == "atom" && el[1] == "undefined") return "";
				return parenthesize(el, "seq");
			})), "]" ]);
		},
		"stat": function(stmt) {
			return make(stmt).replace(/;*\s*$/, ";");
		},
		"seq": function() {
			return add_commas(MAP(slice(arguments), make));
		},
		"label": function(name, block) {
			return add_spaces([ make_name(name), ":", make(block) ]);
		},
		"with": function(expr, block) {
			return add_spaces([ "with", "(" + make(expr) + ")", make(block) ]);
		},
		"atom": function(name) {
			return make_name(name);
		}
	};

	// The squeezer replaces "block"-s that contain only a single
	// statement with the statement itself; technically, the AST
	// is correct, but this can create problems when we output an
	// IF having an ELSE clause where the THEN clause ends in an
	// IF *without* an ELSE block (then the outer ELSE would refer
	// to the inner IF).  This function checks for this case and
	// adds the block brackets if needed.
	function make_then(th) {
		if (th[0] == "do") {
			// https://github.com/mishoo/UglifyJS/issues/#issue/57
			// IE croaks with "syntax error" on code like this:
			//	 if (foo) do ... while(cond); else ...
			// we need block brackets around do/while
			return make([ "block", [ th ]]);
		}
		var b = th;
		while (true) {
			var type = b[0];
			if (type == "if") {
				if (!b[3])
					// no else, we must add the block
					return make([ "block", [ th ]]);
				b = b[3];
			}
			else if (type == "while" || type == "do") b = b[2];
			else if (type == "for" || type == "for-in") b = b[4];
			else break;
		}
		return make(th);
	};

	function make_function(name, args, body, keyword) {
		var out = keyword || "function";
		if (name) {
			out += " " + make_name(name);
		}
		out += "(" + add_commas(MAP(args, make_name)) + ")";
		return add_spaces([ out, make_block(body) ]);
	};

	function make_block_statements(statements, noindent) {
		for (var a = [], last = statements.length - 1, i = 0; i <= last; ++i) {
			var stat = statements[i];
			var code = make(stat);
			if (code != ";") {
				if (!beautify && i == last) {
					if ((stat[0] == "while" && empty(stat[2])) ||
						(member(stat[0], [ "for", "for-in"] ) && empty(stat[4])) ||
						(stat[0] == "if" && empty(stat[2]) && !stat[3]) ||
						(stat[0] == "if" && stat[3] && empty(stat[3]))) {
						code = code.replace(/;*\s*$/, ";");
					} else {
						code = code.replace(/;+\s*$/, "");
					}
				}
				a.push(code);
			}
		}
		return noindent ? a : MAP(a, indent);
	};

	function make_switch_block(body) {
		var n = body.length;
		if (n == 0) return "{}";
		return "{" + newline + MAP(body, function(branch, i){
			var has_body = branch[1].length > 0, code = with_indent(function(){
				return indent(branch[0]
						  ? add_spaces([ "case", make(branch[0]) + ":" ])
						  : "default:");
			}, 0.5) + (has_body ? newline + with_indent(function(){
				return make_block_statements(branch[1]).join(newline);
			}) : "");
			if (!beautify && has_body && i < n - 1)
				code += ";";
			return code;
		}).join(newline) + newline + indent("}");
	};

	function make_block(statements) {
		if (!statements) return ";";
		if (statements.length == 0) return "{}";
		return "{" + newline + with_indent(function(){
			return make_block_statements(statements).join(newline);
		}) + newline + indent("}");
	};

	function make_1vardef(def) {
		var name = def[0], val = def[1];
		if (val != null)
			name = add_spaces([ make_name(name), "=", parenthesize(val, "seq") ]);
		return name;
	};

	var $stack = [];

	function make(node) {
		var type = node[0];
		var gen = generators[type];
		if (!gen)
			throw new Error("Can't find generator for \"" + type + "\"");
		$stack.push(node);
		var ret = gen.apply(type, node.slice(1));
		$stack.pop();
		return ret;
	};

	return make(ast);
};

/* -----[ Utilities ]----- */

function repeat_string(str, i) {
	return i < 1 ? "" : new Array(i + 1).join(str);
};

function defaults(args, defs) {
	var ret = {};
	if (args === true)
		args = {};
	for (var i in defs) if (HOP(defs, i)) {
		ret[i] = (args && HOP(args, i)) ? args[i] : defs[i];
	}
	return ret;
};

function is_identifier(name) {
	return /^[a-z_$][a-z0-9_$]*$/i.test(name)
		&& name != "this"
		&& !HOP(KEYWORDS_ATOM, name)
		&& !HOP(RESERVED_WORDS, name)
		&& !HOP(KEYWORDS, name);
};

function MAP(a, f, o) {
	var ret = [];
	for (var i = 0; i < a.length; ++i) {
		ret.push(f.call(o, a[i], i));
	}
	return ret;
};

/* -----[ Exports ]----- */

return {
	parse: parse,
	gen_code: gen_code,
	tokenizer: tokenizer,
	ast_walker: ast_walker
};

};
