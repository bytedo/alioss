/**
 * {}
 * @author yutent<yutent.io@gmail.com>
 * @date 2023/02/17 19:14:08
 */
import { MIME_TYPES, DEFAULT_MIME_TYPE } from './constants.js'

// 把文件大小, 转为友好的格式
export function parseSize(num) {
  if (num < 1024) {
    return `${num} B`
  } else {
    num = (num / 1024).toFixed(2) - 0

    if (num < 1024) {
      return `${num} KB`
    } else {
      num = (num / 1024).toFixed(2) - 0
      return `${num} MB`
    }
  }
}

// 获取文件的拓展名
export function getExt(str = '') {
  let tmp = str.split('.')
  let ext

  if (tmp.length > 1) {
    ext = tmp.pop()
    if (ext === 'xz' || ext === 'gz') {
      ext = tmp.pop() + ext
    }
    return ext
  }
  return 'unknow'
}

export function getMimeType(name) {
  var ext = getExt(name)
  return MIME_TYPES[ext] || DEFAULT_MIME_TYPE
}

export function fixFile(name, data) {
  return new File([data], name, { type: getMimeType(name) })
}

// 生成要签名的字符串
export function str2sign(
  method = 'GET',
  bucket,
  { time, headers = {}, key, query } = {}
) {
  let arr = [
    method,
    '', // 请求内容的md5值, 用于服务端校验文件是否完整. 可以为空
    '', // 请求文件的content-type类型, 可以为空
    time,
    Object.keys(headers)
      .sort()
      .map(k => `${k}:${headers[k]}`)
      .join('\n'),
    `/${bucket}/${key + (query || '')}`
  ]
  return arr.join('\n')
}
