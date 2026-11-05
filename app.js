/* Bahrain Fuel Cost
   Reads prices.json, calculates the monthly cost, and saves your inputs on this device. */

(function () {
    "use strict";

    var STORE_KEY = "bahrain-fuel-cost-v1";

    var FUELS = [
        { id: "jayyid", name: "Jayyid 91" },
        { id: "mumtaz", name: "Mumtaz 95" },
        { id: "super", name: "Super 98" },
        { id: "diesel", name: "Diesel" }
    ];

    // Used only if prices.json cannot be loaded.
    var FALLBACK = {
        month: "November 2026",
        updated: "2026-11-05",
        prices: { jayyid: 0.235, mumtaz: 0.277, super: 0.410, diesel: 0.260 }
    };

    var DEFAULTS = { fuel: "mumtaz", mode: "km", km: 1200, cons: 8.5, tank: 45, fills: 4 };

    var data = FALLBACK;        // latest official prices
    var saved = {};             // values stored on this device
    var state = {};
    var overrides = {};         // prices the user typed in, valid for data.month only

    function $(id) { return document.getElementById(id); }

    function f3(n) { return n.toFixed(3); }
    function f0(n) { return Math.round(n).toLocaleString("en-US"); }

    function positive(v) {
        var n = parseFloat(v);
        return isFinite(n) && n > 0 ? n : 0;
    }

    /* Storage */

    function load() {
        try {
            saved = JSON.parse(localStorage.getItem(STORE_KEY)) || {};
        } catch (e) {
            saved = {};
        }
    }

    function save() {
        try {
            localStorage.setItem(STORE_KEY, JSON.stringify({
                state: state,
                overrides: { month: data.month, prices: overrides }
            }));
        } catch (e) { /* private mode: ignore */ }
    }

    function initState() {
        var s = saved.state || {};
        state = {};
        Object.keys(DEFAULTS).forEach(function (k) {
            state[k] = s[k] !== undefined ? s[k] : DEFAULTS[k];
        });
        if (!FUELS.some(function (f) { return f.id === state.fuel; })) state.fuel = DEFAULTS.fuel;
        if (state.mode !== "km" && state.mode !== "fill") state.mode = DEFAULTS.mode;

        // Typed prices only count for the month they were typed in.
        var o = saved.overrides;
        overrides = o && o.month === data.month && o.prices ? o.prices : {};
    }

    /* Prices */

    function price(id) {
        if (overrides[id] > 0) return overrides[id];
        return data.prices[id];
    }

    /* Calculation */

    function usage() {
        if (state.mode === "km") {
            var km = positive(state.km);
            return { litres: km * positive(state.cons) / 100, km: km };
        }
        return { litres: positive(state.tank) * positive(state.fills), km: 0 };
    }

    function fuelName(id) {
        return FUELS.filter(function (f) { return f.id === id; })[0].name;
    }

    /* Drawing */

    function buildFuelSelect() {
        var sel = $("fuel");
        sel.innerHTML = "";
        FUELS.forEach(function (f) {
            var o = document.createElement("option");
            o.value = f.id;
            o.textContent = f.name + " · " + f3(price(f.id)) + " BHD/L";
            sel.appendChild(o);
        });
        sel.value = state.fuel;
    }

    function buildPriceInputs() {
        var box = $("priceInputs");
        box.innerHTML = "";
        FUELS.forEach(function (f) {
            var label = document.createElement("label");
            label.setAttribute("for", "price-" + f.id);
            label.textContent = f.name;

            var input = document.createElement("input");
            input.id = "price-" + f.id;
            input.type = "number";
            input.inputMode = "decimal";
            input.step = "0.001";
            input.min = "0";
            input.value = f3(price(f.id));
            input.addEventListener("input", function () {
                var v = parseFloat(input.value);
                if (isFinite(v) && v > 0) overrides[f.id] = v;
                else delete overrides[f.id];
                render(true);
            });

            label.appendChild(input);
            box.appendChild(label);
        });
    }

    function render(keepPriceBoxes) {
        var u = usage();
        var p = price(state.fuel);
        var month = u.litres * p;

        $("month").textContent = f3(month);
        $("fuelLine").textContent = fuelName(state.fuel) + " at " + f3(p) + " BHD per litre";
        $("litres").textContent = u.litres.toFixed(1);
        $("perDay").textContent = f3(month / 30);
        $("perKm").textContent = u.km > 0 ? f3(month / u.km) : "-";
        $("year").textContent = f0(month * 12);

        var rows = FUELS.map(function (f) {
            var m = u.litres * price(f.id);
            return '<div class="row' + (f.id === state.fuel ? " on" : "") + '">' +
                '<div class="name">' + f.name + '<small>' + f3(price(f.id)) + ' BHD/L</small></div>' +
                '<div class="val">' + f3(m) + '<small>per month</small></div>' +
                '<div class="val">' + f0(m * 12) + '<small>per year</small></div>' +
                '</div>';
        });
        $("compare").innerHTML = rows.join("");

        // Fuel list text shows prices too.
        var sel = $("fuel");
        for (var i = 0; i < sel.options.length; i++) {
            sel.options[i].textContent = FUELS[i].name + " · " + f3(price(FUELS[i].id)) + " BHD/L";
        }

        if (!keepPriceBoxes) buildPriceInputs();
        showMode();
        save();
    }

    function showMode() {
        var km = state.mode === "km";
        $("kmInputs").hidden = !km;
        $("fillInputs").hidden = km;
        $("modeKm").setAttribute("aria-pressed", String(km));
        $("modeFill").setAttribute("aria-pressed", String(!km));
    }

    function fillInputs() {
        ["km", "cons", "tank", "fills"].forEach(function (id) {
            $(id).value = state[id];
        });
    }

    function writeNote() {
        var text = "Rates set by the Fuel Pricing and Monitoring Committee for " + data.month +
            ". Bahrain resets them every month.";
        if (data.updated) text += " Prices last checked " + data.updated + ".";
        if (Object.keys(overrides).length) text += " You are using some prices you typed in.";
        $("note").textContent = text;
    }

    /* Events */

    function bind() {
        $("fuel").addEventListener("change", function () {
            state.fuel = $("fuel").value;
            render(true);
        });

        $("modeKm").addEventListener("click", function () { state.mode = "km"; render(true); });
        $("modeFill").addEventListener("click", function () { state.mode = "fill"; render(true); });

        ["km", "cons", "tank", "fills"].forEach(function (id) {
            $(id).addEventListener("input", function () {
                state[id] = $(id).value === "" ? 0 : parseFloat($(id).value);
                render(true);
            });
        });

        var steppers = document.querySelectorAll(".stepper button");
        Array.prototype.forEach.call(steppers, function (b) {
            b.addEventListener("click", function () {
                var id = b.getAttribute("data-target");
                var step = parseFloat(b.getAttribute("data-step"));
                var next = Math.max(0, Math.round((positive(state[id]) + step) * 100) / 100);
                state[id] = next;
                $(id).value = next;
                render(true);
            });
        });

        $("resetPrices").addEventListener("click", function () {
            overrides = {};
            buildFuelSelect();
            render(false);
            writeNote();
        });

        $("resetAll").addEventListener("click", function () {
            overrides = {};
            Object.keys(DEFAULTS).forEach(function (k) { state[k] = DEFAULTS[k]; });
            $("fuel").value = state.fuel;
            fillInputs();
            render(false);
            writeNote();
        });
    }

    function start() {
        load();
        initState();
        buildFuelSelect();
        fillInputs();
        bind();
        render(false);
        writeNote();
    }

    function usePrices(d) {
        var ok = d && d.prices && FUELS.every(function (f) { return d.prices[f.id] > 0; });
        if (ok) data = d;
    }

    fetch("prices.json", { cache: "no-store" })
        .then(function (r) { return r.json(); })
        .then(usePrices)
        .catch(function () {})
        .then(start);
})();
