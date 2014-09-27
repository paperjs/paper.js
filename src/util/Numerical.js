/*
 * Paper.js - The Swiss Army Knife of Vector Graphics Scripting.
 * http://paperjs.org/
 *
 * Copyright (c) 2011 - 2014, Juerg Lehni & Jonathan Puckey
 * http://scratchdisk.com/ & http://jonathanpuckey.com/
 *
 * Distributed under the MIT license. See LICENSE file for details.
 *
 * All rights reserved.
 */

/**
 * @name Numerical
 * @namespace
 * @private
 */
var Numerical = new function() {

    // Lookup tables for abscissas and weights with values for n = 2 .. 16.
    // As values are symmetric, only store half of them and adapt algorithm
    // to factor in symmetry.
    var abscissas = [
    /*  2 */ [  0.5773502691896257645091488],
    /*  3 */ [0,0.7745966692414833770358531],
    /*  4 */ [  0.3399810435848562648026658,0.8611363115940525752239465],
    /*  5 */ [0,0.5384693101056830910363144,0.9061798459386639927976269],
    /*  6 */ [  0.2386191860831969086305017,0.6612093864662645136613996,0.9324695142031520278123016],
    /*  7 */ [0,0.4058451513773971669066064,0.7415311855993944398638648,0.9491079123427585245261897],
    /*  8 */ [  0.1834346424956498049394761,0.5255324099163289858177390,0.7966664774136267395915539,0.9602898564975362316835609],
    /*  9 */ [0,0.3242534234038089290385380,0.6133714327005903973087020,0.8360311073266357942994298,0.9681602395076260898355762],
    /* 10 */ [  0.1488743389816312108848260,0.4333953941292471907992659,0.6794095682990244062343274,0.8650633666889845107320967,0.9739065285171717200779640],
    /* 11 */ [0,0.2695431559523449723315320,0.5190961292068118159257257,0.7301520055740493240934163,0.8870625997680952990751578,0.9782286581460569928039380],
    /* 12 */ [  0.1252334085114689154724414,0.3678314989981801937526915,0.5873179542866174472967024,0.7699026741943046870368938,0.9041172563704748566784659,0.9815606342467192506905491],
    /* 13 */ [0,0.2304583159551347940655281,0.4484927510364468528779129,0.6423493394403402206439846,0.8015780907333099127942065,0.9175983992229779652065478,0.9841830547185881494728294],
    /* 14 */ [  0.1080549487073436620662447,0.3191123689278897604356718,0.5152486363581540919652907,0.6872929048116854701480198,0.8272013150697649931897947,0.9284348836635735173363911,0.9862838086968123388415973],
    /* 15 */ [0,0.2011940939974345223006283,0.3941513470775633698972074,0.5709721726085388475372267,0.7244177313601700474161861,0.8482065834104272162006483,0.9372733924007059043077589,0.9879925180204854284895657],
    /* 16 */ [  0.0950125098376374401853193,0.2816035507792589132304605,0.4580167776572273863424194,0.6178762444026437484466718,0.7554044083550030338951012,0.8656312023878317438804679,0.9445750230732325760779884,0.9894009349916499325961542],
    /* 17 */ [0,0.1784841814958478558506775,0.3512317634538763152971855,0.5126905370864769678862466,0.6576711592166907658503022,0.7815140038968014069252301,0.8802391537269859021229557,0.9506755217687677612227170,0.9905754753144173356754340],
    /* 18 */ [  0.0847750130417353012422619,0.2518862256915055095889729,0.4117511614628426460359318,0.5597708310739475346078715,0.6916870430603532078748911,0.8037049589725231156824175,0.8926024664975557392060606,0.9558239495713977551811959,0.9915651684209309467300160],
    /* 19 */ [],
    /* 20 */ [],
    /* 21 */ [],
    /* 22 */ [],
    /* 23 */ [],
    /* 24 */ [],
    /* 25 */ [],
    /* 26 */ [],
    /* 27 */ [],
    /* 28 */ [],
    /* 29 */ [],
    /* 30 */ [],
    /* 31 */ [],
    /* 32 */ [  0.0483076656877383162348126,0.1444719615827964934851864,0.2392873622521370745446032,0.3318686022821276497799168,0.4213512761306353453641194,0.5068999089322293900237475,0.5877157572407623290407455,0.6630442669302152009751152,0.7321821187402896803874267,0.7944837959679424069630973,0.8493676137325699701336930,0.8963211557660521239653072,0.9349060759377396891709191,0.9647622555875064307738119,0.9856115115452683354001750,0.9972638618494815635449811]
    ];

    var weights = [
    /*  2 */ [1],
    /*  3 */ [0.8888888888888888888888889,0.5555555555555555555555556],
    /*  4 */ [0.6521451548625461426269361,0.3478548451374538573730639],
    /*  5 */ [0.5688888888888888888888889,0.4786286704993664680412915,0.2369268850561890875142640],
    /*  6 */ [0.4679139345726910473898703,0.3607615730481386075698335,0.1713244923791703450402961],
    /*  7 */ [0.4179591836734693877551020,0.3818300505051189449503698,0.2797053914892766679014678,0.1294849661688696932706114],
    /*  8 */ [0.3626837833783619829651504,0.3137066458778872873379622,0.2223810344533744705443560,0.1012285362903762591525314],
    /*  9 */ [0.3302393550012597631645251,0.3123470770400028400686304,0.2606106964029354623187429,0.1806481606948574040584720,0.0812743883615744119718922],
    /* 10 */ [0.2955242247147528701738930,0.2692667193099963550912269,0.2190863625159820439955349,0.1494513491505805931457763,0.0666713443086881375935688],
    /* 11 */ [0.2729250867779006307144835,0.2628045445102466621806889,0.2331937645919904799185237,0.1862902109277342514260976,0.1255803694649046246346943,0.0556685671161736664827537],
    /* 12 */ [0.2491470458134027850005624,0.2334925365383548087608499,0.2031674267230659217490645,0.1600783285433462263346525,0.1069393259953184309602547,0.0471753363865118271946160],
    /* 13 */ [0.2325515532308739101945895,0.2262831802628972384120902,0.2078160475368885023125232,0.1781459807619457382800467,0.1388735102197872384636018,0.0921214998377284479144218,0.0404840047653158795200216],
    /* 14 */ [0.2152638534631577901958764,0.2051984637212956039659241,0.1855383974779378137417166,0.1572031671581935345696019,0.1215185706879031846894148,0.0801580871597602098056333,0.0351194603317518630318329],
    /* 15 */ [0.2025782419255612728806202,0.1984314853271115764561183,0.1861610000155622110268006,0.1662692058169939335532009,0.1395706779261543144478048,0.1071592204671719350118695,0.0703660474881081247092674,0.0307532419961172683546284],
    /* 16 */ [0.1894506104550684962853967,0.1826034150449235888667637,0.1691565193950025381893121,0.1495959888165767320815017,0.1246289712555338720524763,0.0951585116824927848099251,0.0622535239386478928628438,0.0271524594117540948517806],
    /* 17 */ [0.1794464703562065254582656,0.1765627053669926463252710,0.1680041021564500445099707,0.1540457610768102880814316,0.1351363684685254732863200,0.1118838471934039710947884,0.0850361483171791808835354,0.0554595293739872011294402,0.0241483028685479319601100],
    /* 18 */ [0.1691423829631435918406565,0.1642764837458327229860538,0.1546846751262652449254180,0.1406429146706506512047313,0.1225552067114784601845191,0.1009420441062871655628140,0.0764257302548890565291297,0.0497145488949697964533349,0.0216160135264833103133427],
    /* 19 */ [],
    /* 20 */ [],
    /* 21 */ [],
    /* 22 */ [],
    /* 23 */ [],
    /* 24 */ [],
    /* 25 */ [],
    /* 26 */ [],
    /* 27 */ [],
    /* 28 */ [],
    /* 29 */ [],
    /* 30 */ [],
    /* 31 */ [],
    /* 32 */ [0.0965400885147278005667648,0.0956387200792748594190820,0.0938443990808045656391802,0.0911738786957638847128686,0.0876520930044038111427715,0.0833119242269467552221991,0.0781938957870703064717409,0.0723457941088485062253994,0.0658222227763618468376501,0.0586840934785355471452836,0.0509980592623761761961632,0.0428358980222266806568786,0.0342738629130214331026877,0.0253920653092620594557526,0.0162743947309056706051706,0.0070186100094700966004071]
    ];

    // Math short-cuts for often used methods and values
    var abs = Math.abs,
        sqrt = Math.sqrt,
        pow = Math.pow,
        cos = Math.cos,
        PI = Math.PI,
        TOLERANCE = 10e-6,
        EPSILON = 10e-12;

    // Sets up min and max values for roots and returns a add() function that
    // handles bounds checks and itself returns the amount of added roots.
    function setupRoots(roots, min, max) {
        var unbound = min === undefined,
            minE = min - EPSILON,
            maxE = max + EPSILON,
            count = 0;
        // Returns a function that adds roots with checks
        return function(root) {
            if (unbound || root > minE && root < maxE)
                roots[count++] = root < min ? min : root > max ? max : root;
            return count;
        };
    }

    return /** @lends Numerical */{
        TOLERANCE: TOLERANCE,
        // Precision when comparing against 0
        EPSILON: EPSILON,
        // Kappa, see: http://www.whizkidtech.redprince.net/bezier/circle/kappa/
        KAPPA: 4 * (sqrt(2) - 1) / 3,

        /**
         * Check if the value is 0, within a tolerance defined by
         * Numerical.EPSILON.
         */
        isZero: function(val) {
            return abs(val) <= EPSILON;
        },

        /**
         * Gauss-Legendre Numerical Integration.
         */
        integrate: function(f, a, b, n) {
            var x = abscissas[n - 2],
                w = weights[n - 2],
                A = 0.5 * (b - a),
                B = A + a,
                i = 0,
                m = (n + 1) >> 1,
                sum = n & 1 ? w[i++] * f(B) : 0; // Handle odd n
            while (i < m) {
                var Ax = A * x[i];
                sum += w[i++] * (f(B + Ax) + f(B - Ax));
            }
            return A * sum;
        },

        /**
         * Root finding using Newton-Raphson Method combined with Bisection.
         */
        findRoot: function(f, df, x, a, b, n, tolerance) {
            for (var i = 0; i < n; i++) {
                var fx = f(x),
                    // Calculate a new candidate with the Newton-Raphson method.
                    dx = fx / df(x),
                    nx = x - dx;
                // See if we can trust the Newton-Raphson result. If not we use
                // bisection to find another candidate for Newton's method.
                if (abs(dx) < tolerance)
                    return nx;
                // Update the root-bounding interval and test for containment of
                // the candidate. If candidate is outside the root-bounding
                // interval, use bisection instead.
                // There is no need to compare to lower / upper because the
                // tangent line has positive slope, guaranteeing that the x-axis
                // intercept is larger than lower / smaller than upper.
                if (fx > 0) {
                    b = x;
                    x = nx <= a ? 0.5 * (a + b) : nx;
                } else {
                    a = x;
                    x = nx >= b ? 0.5 * (a + b) : nx;
                }
            }
            // Return the best result even though we haven't gotten close
            // enough to the root... (In paper.js this never seems to happen).
            return x;
        },

        /**
         * Solves the quadratic polynomial with coefficients a, b, c for roots
         * (zero crossings) and and returns the solutions in an array.
         *
         * a*x^2 + b*x + c = 0
         */
        solveQuadratic: function(a, b, c, roots, min, max) {
            var add = setupRoots(roots, min, max);

            // Code ported over and adapted from Uintah library (MIT license).
            // If a is 0, equation is actually linear, return 0 or 1 easy roots.
            if (abs(a) < EPSILON) {
                if (abs(b) >= EPSILON)
                    return add(-c / b);
                // If all the coefficients are 0, we have infinite solutions!
                return abs(c) < EPSILON ? -1 : 0; // Infinite or 0 solutions
            }
            // Convert to normal form: x^2 + px + q = 0
            var p = b / (2 * a);
            var q = c / a;
            var p2 = p * p;
            if (p2 < q - EPSILON)
                return 0;
            var s = p2 > q ? sqrt(p2 - q) : 0,
                count = add(s - p);
            if (s > 0)
                count = add(-s - p);
            return count;
        },

        /**
         * Solves the cubic polynomial with coefficients a, b, c, d for roots
         * (zero crossings) and and returns the solutions in an array.
         *
         * a*x^3 + b*x^2 + c*x + d = 0
         */
        solveCubic: function(a, b, c, d, roots, min, max) {
            // If a is 0, equation is actually quadratic.
            if (abs(a) < EPSILON)
                return Numerical.solveQuadratic(b, c, d, roots, min, max);

            // Code ported over and adapted from Uintah library (MIT license).
            // Normalize to form: x^3 + b x^2 + c x + d = 0:
            b /= a;
            c /= a;
            d /= a;
            var add = setupRoots(roots, min, max),
                // Compute discriminants
                bb = b * b,
                p = (bb - 3 * c) / 9,
                q = (2 * bb * b - 9 * b * c + 27 * d) / 54,
                // Use Cardano's formula
                ppp = p * p * p,
                D = q * q - ppp;
            // Substitute x = y - b/3 to eliminate quadric term: x^3 +px + q = 0
            b /= 3;
            if (abs(D) < EPSILON) {
                if (abs(q) < EPSILON) // One triple solution.
                    return add(-b);
                // One single and one double solution.
                var sqp = sqrt(p),
                    snq = q > 0 ? 1 : -1;
                add(-snq * 2 * sqp - b);
                return add(snq * sqp - b);
            }
            if (D < 0) { // Casus irreducibilis: three real solutions
                var sqp = sqrt(p),
                    phi = Math.acos(q / (sqp * sqp * sqp)) / 3,
                    t = -2 * sqp,
                    o = 2 * PI / 3;
                add(t * cos(phi) - b);
                add(t * cos(phi + o) - b);
                return add(t * cos(phi - o) - b);
            }
            // One real solution
            var A = (q > 0 ? -1 : 1) * pow(abs(q) + sqrt(D), 1 / 3);
            return add(A + p / A - b);
        }
    };
};
