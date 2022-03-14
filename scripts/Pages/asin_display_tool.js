$(document).ready(function () {
    API.APP.init_page(CONST.app_const.asin_display_tool.key).then(function () {

        "use strict";
        document.querySelector("#btn_gen_links").addEventListener("click", function () {
            var e = document.querySelector("#id_marketplace").value;
            if (e) {
                var n = document.querySelector("#id_asins").value.split(/[(\r\n)\r\n\s,，]+/);
                if (n.forEach(function (e, r) {
                    e ? e = e.replace(/\s+/, "") : n.splice(r, 1)
                }), n = Array.from(new Set(n)), e && n && n.length > 0) {
                    var r = "https://" + e + "/s?k=" + encodeURIComponent(n.join("|")) + "&ref=nb_sb_noss";
                    document.querySelector("#id_result").innerHTML = "<a target='_blank' href='" + r + "'>" + r + "</a>"
                }
            }
        });


    });


});

