;(function() {
    var global = GameGlobal
    function inject() {
        global.window = global
        global.document = {
            createElement: function(name) {
                if (name === 'canvas') return wx.createCanvas()
                return {}
            },
            addEventListener: function(type, listener) {},
            removeEventListener: function(type, listener) {},
            getElementById: function(id) { return null }
        }
        global.innerWidth = wx.getSystemInfoSync().windowWidth
        global.innerHeight = wx.getSystemInfoSync().windowHeight
        if (!global.requestAnimationFrame) {
            global.requestAnimationFrame = window.requestAnimationFrame = function(callback) {
                return setTimeout(callback, 1000 / 60)
            }
            global.cancelAnimationFrame = window.cancelAnimationFrame = function(id) {
                clearTimeout(id)
            }
        }
    }
    if (!global.window) inject()
})()
export default {}