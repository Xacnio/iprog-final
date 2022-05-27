$(document).ready(() => {
    // Sticky Header, sticky status is changing with scroll
    $('#mobile-nav-toggle').click(() => {
        if ($('.header-bs').has('mobile-disable')) {
            $('.header-bs').removeClass('mobile-disable').addClass('mobile-enable');
        }
    })
    $('#menu-close').click(() => {
        if ($('.header-bs').has('mobile-enable')) {
            $('.header-bs').removeClass('mobile-enable').addClass('mobile-disable');
        }
    })
    var sticky = $('.header').height();
    var lastY = null;
    var hhtimer = null;
    window.onscroll = function () {
        if (window.pageYOffset > sticky) {
            const currentY = window.pageYOffset;
            if (lastY != null) {
                if (currentY >= lastY) {
                    clearTimeout(hhtimer);
                    $('.header').css('display', 'block')
                    $('.header').addClass('sticky').removeClass("sticky-hide");
                } else if (!$('.header-bs').hasClass('mobile-enable')) {
                    $('.header').removeClass('sticky').addClass("sticky-hide");
                    clearTimeout(hhtimer);
                    hhtimer = setTimeout(() => {
                        if ($('.header').hasClass("sticky")) $('.header').css('display', 'none')
                    }, 500);
                }
            }
            lastY = window.pageYOffset;

        } else if (!$('.header-bs').hasClass('mobile-enable')) {
            $('.header')./*removeClass('sticky').*/removeClass('sticky-hide');
            $('.header').css('display', 'block');
        }
    };

    // Lazy Image Loading
    $(function () {
        $('img.lazy').Lazy({
            effect: 'fadeIn',
            effectTime: 250,
        });
    });

    // Header Dropdown Menu
    $('.header-user-dropdown').prev().click((e) => {
        e.stopPropagation();
        e.preventDefault();
        $('.header-user-dropdown').addClass("open");
    })
    $(document).click(function () {
        var headerUserDropdown = $('.header-user-dropdown')
        headerUserDropdown.removeClass("open");
    });

    // Profile Tabs
    $('.profile-menu a').click((e) => {
        var item = $(e.target)
        if (item.parent('li').hasClass("active")) {
            return;
        }
        var href = $(e.target).attr("href");
        var tab = $(`.tab[tab-name="${href}"]`);
        $('.profile-menu li').removeClass("active");
        item.parent('li').addClass("active")
        if (tab.length != 0) {
            $('.tab').removeClass("in")
            setTimeout(() => {
                $('.tab').removeClass("open")
                setTimeout($('.tab').removeClass("open"), 1000)
                tab.addClass("open")
                setTimeout(() => tab.addClass("in"), 150)
            }, 150)
        }
    })

    // Single photo file input with preview
    $(".form-input-photo").change(function (e) {
        var thisInput = $(e.target);
        var mainDiv = thisInput.parent('div');
        var textDiv = thisInput.prev('span');
        thisInput.innerHTML = "";
        if (this.files.length === 0) {
            mainDiv.attr('style', "");
            textDiv.html(textDiv.attr('default'));
            return
        }
        [].forEach.call(this.files, function (file, index) {
            var reader = new FileReader();
            reader.onload = (function (theFile) {
                return function (e) {
                    let fileName = file.name;
                    if (fileName.length > 20) {
                        const ext = fileName.split(/[\s.]+/)
                        const extension = ext[ext.length - 1]
                        const fileNameS = fileName.split('.').slice(0, -1).join('.');
                        fileName = fileNameS.substring(0, 16) + "." + extension
                    }
                    mainDiv.attr('style', "background-image: -webkit-linear-gradient(rgb(0 195 255 / 63%), rgb(0 0 0 / 63%)), url(" + e.target.result + ");color: white !important;");
                    if (!textDiv.attr("default")) textDiv.attr("default", textDiv.html());
                    textDiv.html(fileName);
                };
            })(file);
            reader.readAsDataURL(file);
        });
    });

    // Photo Gallery Buttons
    $('ul.slide-buttons li > button').click((e) => {
        var photos = $(e.currentTarget).parent().parent().prev('.photos')
        var photo = $('.photos > .gallery-block').outerWidth();
        var pscrollLeft = photos.scrollLeft();
        var prev = ($(e.currentTarget).attr("action") === "prev") ? true : false;
        if (prev) {
            var newPos = pscrollLeft - photo;
            photos.stop().animate({ scrollLeft: newPos }, 300)
        } else {
            var newPos = pscrollLeft + photo;
            photos.stop().animate({ scrollLeft: newPos }, 300)
        }
        $("html,body").trigger("scroll");
    })

    // Tab Change with Hash
    var hash = window.location.hash;
    if (typeof hash === "string" && hash.length > 0) {
        $(`a[href="${hash}"]`).click();
    }
    window.addEventListener('hashchange', function () {
        var hash = window.location.hash;
        if (typeof hash === "string" && hash.length > 0) {
            $(`a[href="${hash}"]`).click();
        }
    }, false);
})