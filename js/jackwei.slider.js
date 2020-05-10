;(function ($, window, document, undefined) {
    'use strict';

    var pluginName = "jackWeiSlider";

    var defaults = {
        handleSrc: '../Images/slider_handle.png',             // 滑块图片地址，相对路径
        progress: 0.3,                                        // 默认数值
        isCustomText: false,                                  // 是否标签同步更新
        direction: 'horizontal',                              // 'vertical'：垂直方向   'horizontal'：水平方向。
    };

    var isTouch = !!(/Android|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent));       // 是否移动端

    //构造函数
    function JackWeiSlider(element, options) {
        // console.log(element[0].id)
        this.element = element;
        this.settings = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        this._elementId = element[0].id;

        this.isEnable = true;
        this.dcX = 0;                                                     // 记录触摸位置
        this.barW = 0;                                                    // 激活的宽度
        this.currW = 0;                                                   // 当前激活的宽度
        this.haMarginL = -12;                                             // 偏移：滑块区域宽度的一半，CSS固定.jws-handle宽度是24
        this.txMarginL = -40;                                             // 偏移：文字区域宽度的一半，CSS固定.jws-text宽度是80
        this.isDrag = false;
        this.progress = 0;
        this.onStartDragCallback;
        this.onDragCallback;
        this.onStopDragCallback;
        // this.maxW = parseInt(this.settings.width.split('px')[0]);         // 区域宽度
        this.maxW = $(`#${this._elementId}`).width();                        // 区域宽度，修改为自动撑满，由外层宽度决定
        this.isCustomText = this.settings.isCustomText;

        // 以下增加垂直方向兼容
        this.isVertical = this.settings.direction == 'vertical';             // 是否垂直
        this.dcY = 0;                                                        // 记录触摸位置  
        this.barH = 0;                                                       // 激活的宽度
        this.currH = 0;                                                      // 当前激活的宽度      
        this.haPositionBoom = -12;                                           // 偏移：滑块区域高度的一半
        this.txPositionBoom = -15;                                           // 偏移：文字区域高度的一半，CSS固定.jws-text宽度是80
        this.maxH = $(`#${this._elementId}`).height();                       // 区域高度，修改为自动撑满，由外层高度决定

        console.log(this.maxH)

        this.init();
    }

    JackWeiSlider.prototype = {
        init: function () {
            var that = this;//避免与内部对象的this重名
            var settings = that.settings;
            var $element = $(that.element);

            // 处理水平和垂直方向的CSS
            let _styleStr =  that.isVertical ? `height:${that.maxH}px` : `width:${that.maxW}px;`;

            // 添加slider元素
            $element.append('<div style="' + _styleStr + '">\n' +
                '        <div class="jws-outside-bar bar-' + settings.direction + '">\n' +
                '            <div class="jws-inside-bar" style="background-color: ' + settings.color + '"></div>\n' +
                '            <img class="jws-handle" src=' + settings.handleSrc + '>\n' +
                '            <div class="jws-text"></div>\n' +
                '        </div>\n' +
                '    </div>'
            );

            //设置默认进度
            that.setProgress(settings.progress);

            // 移动端、PC段兼容修改
            var _actionStartDrag, _actionOnDrag, _actionStopDrag,
                _action = $element[0].id;               // 事件
            var sliderTarget = `#${$element[0].id} .jws-handle`;                                          // 滑动开始 需要绑定当前element下面的jws-handle
            var clickTarget = `#${$element[0].id} .jws-outside-bar`;                                      // 点击 需要绑定当前element下面的jws-outside-bar

            if(isTouch) {
                _actionStartDrag = 'touchstart';
                _actionOnDrag = 'touchmove';
                _actionStopDrag = 'touchend';
                // sliderTarget = document;
            } else {
                _actionStartDrag = 'mousedown';
                _actionOnDrag = 'mousemove';
                _actionStopDrag = 'mouseup';
                // sliderTarget = document;
            }

            // 1.1 开始按下/触摸，此时绑定的是DIV
            $(document).on(_actionStartDrag, sliderTarget, function (e) {
                if (!that.isEnable) return;
                
                // 兼容触摸
                let _elem = e;
                if(isTouch) _elem = e.originalEvent.targetTouches[0];

                that.isDrag = true;

                if(that.isVertical) {
                    // 垂直
                    that.dcY = _elem.clientY;
                } else {
                    // 水平
                    that.dcX = _elem.clientX;
                }

                if (typeof that.onStartDragCallback === 'function') 
                    that.onStartDragCallback();

                e.preventDefault();  // 阻止默认事件
            });

            // 1.2 滑动中/触摸滑动中，此时绑定的是DOCUMENT
            $(document).on(_actionOnDrag, function (e) {
                if (!that.isDrag) return;
                e.preventDefault();  // 阻止默认事件

                // 兼容触摸
                let _elem = e;
                if(isTouch) {
                     _elem = e.originalEvent.targetTouches[0];
                }

                //计算偏移量并开始移动滑块
                if(that.isVertical) {
                    // 垂直
                    that.move(that.dcY - _elem.clientY);   // 移动方向和增长方向相反。即网上划，实际是减小的，故这里要反过来。
                } else {
                    // 水平
                    that.move(_elem.clientX - that.dcX);
                }

                //拖动事件回调
                if (typeof that.onDragCallback === 'function') {
                    that.onDragCallback(that.progress);
                }
            });

            // 1.3 滑动结束/触摸滑动结束，此时绑定的是DOCUMENT
            $(document).on(_actionStopDrag, function (e) {
                if (!that.isDrag) return;

                that.isDrag = false;

                //获取当前控件的位置数据
                that.updateData(that);

                //停止拖拽回调
                if (typeof that.onStopDragCallback === 'function')
                    that.onStopDragCallback();
            });

            // 1.4 增加点击移动滑块到指定位置
            $(document).on('click', clickTarget, function (e) {
                if (!that.isEnable) return;
                // console.log(e)
                
                // click事件PC和触摸是一致的
                let _elem = e;

                let _offset = 0;
                if(that.isVertical) {
                    // 垂直
                    _offset = _elem.clientY - $(this).offset().top;  // 触摸位置离屏幕上边位置 - 滑条离屏幕上边的位置
                    that.setProgress(1- _offset/that.maxH)
                } else {
                    // 水平
                    _offset = _elem.clientX - $(this).offset().left;  // 触摸位置离屏幕左边位置 - 滑条离屏幕左边的位置
                    that.setProgress(_offset/that.maxW)
                }

                console.log('::Click Offset: ' + _offset)


                // 需要同时触发滑动中回调，和滑动结束回调
                if (typeof that.onDragCallback === 'function') {
                    that.onDragCallback(that.progress);
                }
                if (typeof that.onStopDragCallback === 'function')
                    that.onStopDragCallback();
                    
                e.preventDefault();  // 阻止默认事件
            });
        },
        enable: function () {
            this.isEnable = true;
            return this;
        },
        disEnable: function () {
            this.isEnable = false;
            return this;
        },
        setText: function (text) {
            $(this.element).find('.jws-text').text(text);
            this.isCustomText = true;
            return this;
        },
        updateData: function () {
            var $element = $(this.element);
            if(this.isVertical) {
                // 垂直
                this.currH = this.barH = parseInt($element.find('.jws-inside-bar').css('height').split("px")[0]);
                this.haPositionBoom = parseInt($element.find('.jws-handle').css('bottom').split("px")[0]);
                this.txPositionBoom = parseInt($element.find('.jws-text').css('bottom').split("px")[0]);
            } else {
                // 水平
                this.currW = this.barW = parseInt($element.find('.jws-inside-bar').css('width').split("px")[0]);
                this.haMarginL = parseInt($element.find('.jws-handle').css('margin-left').split("px")[0]);
                this.txMarginL = parseInt($element.find('.jws-text').css('margin-left').split("px")[0]);
            }
        },
        move: function (offset) {
            // let that = this;
            //更新UI
            var $element = $(this.element);

            switch(true) {
                case this.isVertical:
                    (() => {  // 垂直

                        // 0 计算滑块初始位置
                        var h = Math.round(this.barH + offset);
                        var hpb = Math.round(this.haPositionBoom + offset);
                        var tpb = Math.round(this.txPositionBoom + offset);
                        console.log('offset:' + offset + ' h:' + h + ' hpb:' + hpb + ' tpb:' + tpb);

                        // 往下限制
                        if (h < 0 || hpb < -12 || tpb < -15) return;
                        // 往上限制
                        if (h > this.maxH || hpb > -12 + this.maxH || tpb > -15 + this.maxH) return;


                        // 更新progress
                        this.progress = h / this.maxH;

                        // 移动滑块位置
                        $element.find('.jws-inside-bar').css('height', h);
                        $element.find('.jws-handle').css('bottom', hpb);
                        $element.find('.jws-text').css('bottom', tpb);
                    })(); break
                case !this.isVertical:
                    (() => {  // 水平
                        
                        // 计算滑块现在的位置
                        var w = Math.round(this.barW + offset);
                        var hml = Math.round(this.haMarginL + offset);
                        var tml = Math.round(this.txMarginL + offset);
                        console.log('offset:' + offset + ' w:' + w + ' hml:' + hml + ' tml:' + tml);

                        // 往左限制
                        if (w < 0 || hml < -12 || tml < -40) return;
                        // 往右限制
                        if (w > this.maxW || hml > -12 + this.maxW || tml > -40 + this.maxW) return;

                        // 更新progress
                        this.progress = w / this.maxW;

                        // 移动滑块位置
                        $element.find('.jws-inside-bar').css('width', w);
                        $element.find('.jws-handle').css('margin-left', hml);
                        $element.find('.jws-text').css('margin-left', tml);
                    })(); break
            }
            
            if (!this.isCustomText)
                $element.find('.jws-text').text(Math.round(this.progress * 100) + "%");
        },
        setProgress: function (progress) {
            var offset = 0;
            if(this.isVertical) {
                // 垂直
                offset = progress * this.maxH - this.currH;          // 减去当前位置回到原点 eg: 0.6 * 300 - 0
                console.log(progress + ' ' + this.maxH + ' ' + this.currH + ' ' + this.barH + ' offset: ' + offset)
            } else {
                // 水平方向
                offset = progress * this.maxW - this.currW;          // 减去当前位置回到原点 eg: 0.6 * 300 - 90
                // console.log(progress + ' ' + this.maxW + ' ' + this.currW + ' ' + this.barW + ' offset: ' + offset)
            }
            this.move(offset);
            this.updateData(this);
            return this;
        },
        setOnStartDragCallback: function (callback) {
            this.onStartDragCallback = callback;
            return this;
        },
        setOnDragCallback: function (callback) {
            this.onDragCallback = callback;
            return this;
        },
        setOnStopDragCallback: function (callback) {
            this.onStopDragCallback = callback;
            return this;
        }
    }

    $.fn.jackWeiSlider = function (options) {
        return new JackWeiSlider(this, options);
    }

})(jQuery, window, document);