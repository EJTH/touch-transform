/**
 * @license MIT (See LICENSE file)
 * @author Elias Toft Hansen 
 * @see https://github.com/EJTH/touch-translate
 */
(function(){
  var TouchTransform = function(){
    // List of ongoing touches  
    var ongoingTouches = [];

    // List of touches last animation tick.
    var lastTouches = [];

    // Previous mouse position.
    var lastMouse = null;

    // Current mouse position.
    var mousePos = null;

    // Current mouse rotation (scroll).
    var mouseRot = 0;

    // Current mouse scale (shift+scroll).
    var mouseScale = 1;

    var mouseScaleFactor = 0;

    // Attached elements acting as controls.
    var attachedElements = [];

    // Element being manipulated currently.
    var currentElement;

    // Input state from previous animation tick.
    var lastState = {};

    // Is current input touch based?
    var isTouch = false;

    // Key defaults
    defaultRotateKey = 'Shift';
    defaultScaleKey = false;

    // scroll wheel mode
    var scrollMode = '';
    
    /**
     * Handle start of touch drag.
     * @param {*} evt 
     */
    function handleTouchStart(evt) {
      endTransform();
      ongoingTouches.length = 0;
      var touches = evt.touches;
      for (var i = 0; i < touches.length; i++) {
        ongoingTouches.push(copyTouch(touches[i]));
      }
      
      if(ongoingTouches.length > 0 && !currentElement){
        var point = getMedianPoint();
        var element = document.elementFromPoint(point.clientX, point.clientY);
        if(startMultiTouchTransform(element)){
            evt.preventDefault();
        };
      }
    }

    /**
     * Handle start of mouse drag.
     * @param {*} evt 
     */
    function handleMouseDown(evt){
      var point = evt;
      lastMouse = evt;
      mousePos = {clientX: evt.clientX, clientY: evt.clientY};
      if(!currentElement){
        var element = document.elementFromPoint(point.clientX, point.clientY);
        if(startMouseTransform(element)){
            evt.preventDefault();
        }
      }
    }
    /**
     * Handle mouse up event
     * @param {*} evt 
     */
    function handleMouseUp(evt){
      endTransform();
    }

    /**
     * Handle mouse movement. Update lastMouse & mousePos
     * @param {*} evt 
     */
    function handleMouseMove(evt){
      lastMouse = mousePos;
      mousePos = {clientX: evt.clientX, clientY: evt.clientY};
    }

    /**
     * Handle keyboard interaction (shift key state)
     * @param {*} evt 
     */
    function handleKeyDown(evt){
      if(!currentElement) return;
      if(evt.key == currentElement.__touchTransformOptions.rotateKey){
        scrollMode = 'rotate';
      } else
      if(evt.key == currentElement.__touchTransformOptions.scaleKey){
        scrollMode = 'scale';
      } else {
        scrollMode = getDefaultScrollMode();
      }
    
    }

    /**
     * Handle keyboard interaction (shift key state)
     * @param {*} evt 
     */
    function handleKeyUp(evt){
      if(!currentElement) return;
      if(evt.key == currentElement.__touchTransformOptions.rotateKey){
        scrollMode = '';
      }
      if(evt.key == currentElement.__touchTransformOptions.scaleKey){
        scrollMode = '';
      }
      if(!scrollMode){
        scrollMode = getDefaultScrollMode();
      }
      
    }

    function getDefaultScrollMode(){
      if(currentElement){
        if(currentElement.__touchTransformOptions.scaleKey === false) return 'scale';
        if(currentElement.__touchTransformOptions.rotateKey === false) return 'rotate';
      }
      return '';
    }

    /**
     * Handle mouse wheel events (zoom or rotate)
     * @param {*} evt 
     */
    function handleWheel(evt){
      if(!currentElement){
        return; 
      }
      evt.preventDefault();
      evt.stopPropagation();
      if(scrollMode == 'rotate'){
        mouseRot += Math.sign(evt.deltaY);
      }
      if(scrollMode == 'scale'){
        mouseScaleFactor += (Math.sign(evt.deltaY) * ((mouseScaleFactor * mouseScaleFactor) + 0.005));
      }
    }
    
    /**
     * Handles touch move events. Keeps track of active touch list.
     * @param {*} evt 
     */
    function handleTouchMove(evt) {
      var touches = evt.changedTouches;
    
      for (var i = 0; i < touches.length; i++) {
        var idx = ongoingTouchIndexById(touches[i].identifier);
        if (idx >= 0) {
          ongoingTouches.splice(idx, 1, copyTouch(touches[i]));  // swap in the new touch record
        }
      }
      if(currentElement) evt.preventDefault();
    }

    /**
     * Handle end of touch events. Updates touch lists.
     * @param {*} evt 
     */
    function handleTouchEnd(evt) {
      var touches = evt.changedTouches;
      for (var i = 0; i < touches.length; i++) {
        var idx = ongoingTouchIndexById(touches[i].identifier);
        if (idx >= 0) {
          ongoingTouches.splice(idx, 1);  // remove it; we're done
        }
      }
      if(ongoingTouches.length < 2) endTransform();
    }

    /**
     * Handle cancel events. Basically same as end.
     * @param {*} evt 
     */
    function handleTouchCancel(evt) {
      handleTouchEnd(evt);
    }

    /**
     * Helper function for making a copy of the neccesary parts of touch events.
     * @param {*} param0 
     */
    function copyTouch({ identifier, clientX, clientY }) {
      return { identifier, clientX, clientY };
    }
    
    /**
     * Find ongoing touch index by its ID. Returns -1 if no touch point is found.
     * @param {*} idToFind 
     */
    function ongoingTouchIndexById(idToFind) {
      for (var i = 0; i < ongoingTouches.length; i++) {
        var id = ongoingTouches[i].identifier;
    
        if (id == idToFind) {
          return i;
        }
      }
      return -1;
    }

    /**
     * Begin mouse based transform interaction
     * @param {*} element 
     */
    function startMouseTransform(element){
      isTouch = false;
      while(element){
        if(attachedElements.indexOf(element) > -1){
          break;
        }
        element = element.parentElement;
      }
      
      if(!element) return;
      var target = element.__touchTransformOptions.target;
      if(!target.__touchTransformInfo){
        resetTransformInfo(target);
      }
      lastState = getMouseTransformState();
      currentElement = element;

      if(!scrollMode) scrollMode = getDefaultScrollMode();

      return true;
    }

    /**
     * Begin touch based transform interaction
     * @param {*} element 
     */
    function startMultiTouchTransform(element){
      while(element){
        if(attachedElements.indexOf(element) > -1){
          break;
        }
        element = element.parentElement;
      }

      if(!element) return;
      
      lastTouches = JSON.parse(JSON.stringify(ongoingTouches));
      var options = element.__touchTransformOptions;
      var target = options.target;

      // Cancel unless single touch mode is on
      if(!options.singleTouch && ongoingTouches.length < 2) return;

      if(!target.__touchTransformInfo){
        resetTransformInfo(target);
      }
      lastState = getTouchTransformState();
      currentElement = element;
      
      isTouch = true;

      return true;
    }

    /**
     * Animation frame function for updating active transform
     */
    function updateTransforms(){
      requestAnimationFrame(updateTransforms);
      if(!currentElement) return;
      try {
        var opt = currentElement.__touchTransformOptions;

        var state = isTouch ? getTouchTransformState() : getMouseTransformState();


        applyCSSTransform(opt.target, state);
        if(opt.onUpdate){
            var css = buildCSSTransform(opt.target.__touchTransformInfo);
            opt.onUpdate(css, opt.target.__touchTransformInfo, ongoingTouches);
        }

        lastState = state;
        lastTouches = JSON.parse(JSON.stringify(ongoingTouches));
      } catch(e){
        console.error(e);
      }
    }

    /**
     * Applies CSS3 transform to the intended target element based on the current and past input states.
     * @param {*} target 
     * @param {*} state 
     */
    function  applyCSSTransform(target, state){
      var targetInfo = target.__touchTransformInfo;
      var pos = {
        x: targetInfo.translation.x + state.pos.clientX - lastState.pos.clientX ,
        y: targetInfo.translation.y + state.pos.clientY - lastState.pos.clientY
      };

      var rotation = targetInfo.rotation + state.rot - lastState.rot;
      
      var scale = state.dist && lastState.dist ? targetInfo.scale * (state.dist / lastState.dist) : targetInfo.scale;
      
      // clamp scale
      var min = currentElement.__touchTransformOptions.minScale || 0.1;
      var max = currentElement.__touchTransformOptions.maxScale || 100;
      scale = Math.max(min, Math.min(max, scale));

      target.__touchTransformInfo = {
        translation: pos,
        rotation: rotation,
        scale: scale
      };

      target.style.transform = buildCSSTransform(target.__touchTransformInfo);
    }

    function buildCSSTransform(transform){
      return `translate(${transform.translation.x}px,${transform.translation.y}px) rotate(${transform.rotation}deg) scale(${transform.scale})`;
    }

    /**
     * Get input state for mouse interaction
     */
    function getMouseTransformState(){
      if(mouseScaleFactor != 0){
        mouseScale += mouseScale * mouseScaleFactor;
        mouseScaleFactor *= 0.5;
      }
      return {
        rot: mouseRot,
        pos: mousePos,
        dist: mouseScale
      }
    }

    /**
     * Get input state for touch interaction
     */
    function getTouchTransformState(){
      return {
        rot: getTouchRotation(),
        dist: getTouchMedianDistance(),
        pos: getMedianPoint()
      };
    }

    /**
     * Ends transform.
     */
    function endTransform(){
      isTouch = false;
      currentElement = null;
      lastTouches = [];
    }

    /**
     * Gets distance between points x1,y1 & x2,y2
     * @param {*} x1 
     * @param {*} y1 
     * @param {*} x2 
     * @param {*} y2 
     */
    function getDistance(x1,y1,x2,y2){
      var a = x1 - x2;
      var b = y1 - y2;
      return Math.hypot(a, b);
    }
    

    /**
     * Gets median distance between ongoingTouches
     */
    function getTouchMedianDistance(){
      var middle = getMedianPoint();
      var dist = 0;
      
      if(ongoingTouches.length == 1) return 0;
      
      ongoingTouches.forEach(touch => {
        dist += getDistance(middle.clientX, middle.clientY, touch.clientX, touch.clientY);
      });
      return dist / ongoingTouches.length;
    }

    /**
     * Retrieves current rotation state from touch interaction
     */
    function getTouchRotation(){
      if(ongoingTouches.length == 1) return 0;
      var lastTouch = lastTouches[0];
      var touch = ongoingTouches[ongoingTouchIndexById(lastTouch.identifier)];
      if(!touch) endTransform();
      var middle = getMedianPoint(ongoingTouches);

      return findAngle(lastTouch, middle, touch);

      
    }

    /**
     * Finds angle between points a, b and c (c=[b.x+1,b.y])
     * @param {*} a 
     * @param {*} b 
     */
    function findAngle(a,b) {
      var c = {
        clientX: b.clientX+1,
        clientY: b.clientY
      }
      var atanA = Math.atan2(a.clientX - b.clientX, a.clientY - b.clientY);
      var atanC = Math.atan2(c.clientX - b.clientX, c.clientY - b.clientY);
      var diff = atanC - atanA;
      
      diff *= 180 / Math.PI;
      return diff;
    }
    
    /**
     * Find Median point between points in touchList.
     * @param {*} touchList Uses ongoing touches if not set.
     */
    function getMedianPoint(touchList){
      touchList = touchList || ongoingTouches;
      var x = 0;
      var y = 0;
      touchList.forEach(touch => {
        x += touch.clientX;
        y += touch.clientY;
      });
      x = x / touchList.length;
      y = y / touchList.length;
      return {clientX: x, clientY: y};
    }

    /**
     * Reset target elements internal state.
     * This function is used to initialize the state in start drag functions
     * and used to reset transform entirely through the TouchTransform.reset() function.
     * @param {*} target Target element
     */
    function resetTransformInfo(target){
      if(!target.__touchTransformOrigin){
        target.__touchTransformOrigin = parseTransform(target.style.transform, {
          translation: {x:0,y:0},
          rotation: 0,
          scale: 1
        });
      }
      target.__touchTransformInfo = target.__touchTransformOrigin;
      target.style = buildCSSTransform(target.__touchTransformOrigin);
    }

    /**
     * Parse CSS transform string into a useful object.
     * @param {*} transformStr 
     * @param {*} defaults 
     */
    function parseTransform(transformStr, defaults){
      var parsed = JSON.parse(JSON.stringify(defaults));
      var reg = /(translate|rotate|scale)\(([^)]+)\)/gi
      var arr = [...transformStr.matchAll(reg)];
      arr.forEach(transform => {
        var op = transform[1];
        var val = transform[2];
        if(op == 'translate'){
          var xy = val.split(',');
          val = {
            x : parseFloat(xy[0]),
            y : parseFloat(xy[1])
          }
        } else {
          val = parseFloat(val);
        }
        parsed[op] = val
      });
      return parsed;
    }

    /**
     * Returns a skeleton object to be used as a dummy element if target is explicitly set to false.
     */
    function getDummyElement(){
      return {
        style: {
          transform: ""
        }
      }
    }

    // Attach touch event handlers.
    window.addEventListener('touchstart', handleTouchStart,  { passive:false });
    window.addEventListener('touchmove', handleTouchMove, { passive:false });
    window.addEventListener('touchend', handleTouchEnd, false);
    window.addEventListener('touchcancel', handleTouchCancel, false);

    // Attach mouse event Handlers.
    window.addEventListener('mousedown', handleMouseDown, { passive:false });
    window.addEventListener('mouseup', handleMouseUp, false);
    window.addEventListener('mousemove', handleMouseMove, false);
    window.addEventListener('keydown', handleKeyDown, false);
    window.addEventListener('keyup', handleKeyUp, false);
    window.addEventListener('wheel', handleWheel, { passive:false });
    
    // Start animation loop.
    requestAnimationFrame(updateTransforms);

    return {
      /**
       * Attached touch transform functionality to element.
       * If optional target is specified, the target will be manipulated instead of the element.
       * This is useful for when you want touches on say the entire page to transform a specific element.
       * If you use attach on an element which already has a CSS3 transform set, TouchTransform will remember it and reset to it if .reset is called.
       * Though there is a caveat: You can only use px values for translation and deg for rotate. If you need to apply a transform with other measurements.
       * it is recommended to do so in a wrapping element instead.
       * @param {DOMElement} element Element that should respond to transform interactions.
       * @param {Object} options Object containing settings, such as:
       *  target    : DOMElement which should be transformed. If undefined defaults to `element`. If false it doesn't affect a target.
       *  onUpdate  : Optional callback called when transform updates. Useful if target is false.
       *  rotateKey : Key to be pressed for rotation. (Default: "Shift")
       *  scaleKey  : Key to be pressed for scaling (Default: false)
       */
      attach: function attach(element, options){
        attachedElements.push(element);
        options = options || {};
        options.target = options.target === undefined ? element : options.target;
        options.target = options.target === false ? getDummyElement() : options.target;

        if(options.rotateKey === undefined){
          options.rotateKey = defaultRotateKey;
        }
        if(options.scaleKey === undefined){
          options.scaleKey = defaultScaleKey;
        }

        element.__touchTransformOptions = options;
      },

      /**
       * Reset the applied transform to the elements original.
       * @param {*} element 
       */
      reset: function reset(element){
        var target = element.__touchTransformOptions.target;
        resetTransformInfo(target);
      }
    };
  }();

  // Add module node support
  if ( typeof module === "object" && module && typeof module.exports === "object" ) {
    module.exports = TouchTransform;
  } else {
    // If not a node like environment check if its AMD
    if ( typeof define === "function" && define.amd ) {
      define( "touch-transform", [], function () { return TouchTransform; } );
    }

    // Add to window object
    window.TouchTransform = TouchTransform;
  }
})();