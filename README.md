# TouchTransform
TouchTransform is a simple to use library for utilizing multi-touch gestures and mouse for visual transforms (Translation, rotation and scaling) based on well-established user interactions such as pinch zooming, two finger rotation and movement (ie. translation).
TouchTransform can perform the transforms automatically through CSS3 transforms, or you can get the data yourself through the `onUpdate` callback if you wish to perform your own transformation (ie. if you are doing your own rendering through HTML5 canvas or would like to use the data for another purpose).

Check out the [demo](https://ejth.github.io/touch-transform/demo.html)!

## Usage
The simplest way to use TouchTransform is to include the script and then call the attach function:

### Basic Usage
```javascript
// Adds transform functionality
TouchTransform.attach(document.querySelector('#transformableElement'));

// Resets the transform to its origin
TouchTransform.reset(document.querySelector('#transformableObject'));

// Removes transform functionality
TouchTransform.detach(document.querySelector('#transformableElement'));
```

### Custom Target
If you want to affect another element than the one recieving the gestures, you can use the target option to specify an alternative target. If you set target to false, no CSS3 transforms will be performed.

```javascript
TouchTransform.attach(document.body, {
    target: document.querySelector('#transformableElement')
});
```

### Using update Callback
If you only want to recieve the transformation data for your own usage, you can use the `onUpdate` callback

```javascript
TouchTransform.attach(document.body, {
    target: false,
    onUpdate: function(cssTransform, transformData){
        // Example String: 'translate(0px,0px) rotate(45deg) scale(1.5)'
        console.log(cssTransform);
        
        // Example Object: { translation: { x:0, y:0 }, rotation: 45, scale: 1.5 }
        console.log(transformData);
    }
});
```

### Rotate & scale with mouse scroll
By default scaling is performed with click+scroll and rotation is performed with click+shift+scroll. If you wish to change this behaviour you can do so with the `scaleKey` and `rotateKey` options. See [MDN Page on Key Values](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values) for valid values.

## Module support
This library supports AMD if define exists, otherwise it will be available in the window global object.

## Licensing
This code is provided under the MIT license.