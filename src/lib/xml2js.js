/**
 * {alioss专用}
 * @author yutent<yutent.io@gmail.com>
 * @date 2023/02/15 16:16:08
 */

function parseDOM(dom) {
  let dict = {}
  if (dom.children.length) {
    dict[dom.tagName] = [...dom.children].map(it => parseDOM(it))
  } else {
    dict[dom.tagName] = dom.textContent.trim()
  }
  return dict
}

function getKey(obj) {
  return Object.keys(obj)[0]
}

function fixDict(dict) {
  let k = getKey(dict)
  let newDict = {}

  if (Array.isArray(dict[k])) {
    for (let it of dict[k]) {
      let _k = getKey(it)
      let tmp = fixDict(it)

      if (newDict[_k]) {
        if (!Array.isArray(newDict[_k])) {
          newDict[_k] = [{ ...newDict[_k] }]
        }
        newDict[_k].push(tmp)
      } else {
        newDict[_k] = tmp
      }
    }
  } else {
    if (dict[k] === '') {
      return ''
    } else {
      let v = +dict[k]
      return v === v ? v : dict[k]
    }
  }
  return newDict
}

export default function (xml) {
  let parser = new DOMParser()
  let doc = parser.parseFromString(xml, 'application/xml').children[0]

  return fixDict(parseDOM(doc))
}
