let SymbolPolyfill = window.Symbol
let idCounter = 0
if (!SymbolPolyfill) {
  SymbolPolyfill = function Symbol(key) {
    return `__Symbol_${key}_${idCounter++}`
  }
  SymbolPolyfill.iterator = SymbolPolyfill('iterator')
}
export default SymbolPolyfill