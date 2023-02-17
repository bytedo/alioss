/**
 * 阿里云oss, 自签名
 * @author yutent<yutent@doui.cc>
 * @date 2020/01/18 14:28:47
 */

import { hmac, base64encode } from 'crypto'
import xml2js from './lib/xml2js.js'
import {
  APP_ID,
  APP_KEY,
  MIME_TYPES,
  DEFAULT_MIME_TYPE
} from './lib/constants.js'
import { getMimeType, fixFile, str2sign } from './lib/helper.js'

export default class Alioss {
  #bucket = ''
  #domain = ''
  #api = ''

  constructor(bucket, domain, region) {
    this.#bucket = bucket
    this.#domain = domain
    this.#api = `https://${bucket}.${region}.aliyuncs.com`
  }

  // 授权签名, 用于临时下载私有bucket的文件
  auth(key) {
    var time = Math.floor(Date.now() / 1000) + 1800 // 半小时内

    return hmac(
      'SHA-1',
      `GET\n\n\n${time}\n/${this.#bucket}/${key}`,
      APP_KEY,
      'base64'
    ).then(signature => {
      return `?OSSAccessKeyId=${APP_ID}&Expires=${time}&Signature=${encodeURIComponent(
        signature
      )}`
    })
  }

  /**
   * {生成签名, 需传入 , 大小限制}
   * dir: 上传目录名
   * size: 大小限制, 单位 MB  默认10MB
   */
  sign(dir = '', size = 10) {
    var time = new Date()
    var params = {
      conditions: [
        ['content-length-range', 0, Math.floor(1024 * 1024 * size)],
        ['starts-with', '$key', dir ? dir.replace(/\/+$/, '') + '/' : '']
      ]
    }
    var policy = ''

    time.setTime(time.getTime() + 60 * 60 * 1000) // 60分钟内有效
    params.expiration = time.toISOString()

    policy = JSON.stringify(params)
    policy = btoa(policy)
    return hmac('SHA-1', policy, APP_KEY, 'base64').then(signature => {
      return { policy, signature, id: APP_ID }
    })
  }

  list({ prefix = '', delimiter = '/', max = 1000, token } = {}) {
    var time = new Date().toGMTString()
    var query = {
      'list-type': 2,
      prefix,
      delimiter,
      'max-keys': max,
      'continuation-token': token
    }
    return hmac(
      'SHA-1',
      `GET\n\n\n${time}\nx-oss-date:${time}\n/${this.#bucket}/${
        token ? '?continuation-token=' + token : ''
      }`,
      APP_KEY,
      'base64'
    )
      .then(signature =>
        fetch(this.#api + '?' + query.toParams(), {
          headers: {
            'content-type': void 0,
            authorization: `OSS ${APP_ID}:${signature}`,
            'x-oss-date': time
          }
        })
      )
      .then(r => r.text())
      .then(r => xml2js(r))
  }

  /**
   * {上传文件}
   * auth: 上面的sign签名结果
   * file: 要上传的文件 <Blob> | <File>
   * key: 要保存的文件名, 带完整路径
   */
  upload(auth, file, key) {
    var body = new FormData()

    if (!file.type) {
      let ext = file.name.split('.').pop()
      if (ext && MIME_TYPES[ext]) {
        file = fixFile(ext, file)
      }
    }

    body.append('key', key) //
    body.append('policy', auth.policy)
    body.append('OSSAccessKeyId', auth.id)
    body.append('Signature', auth.signature)
    body.append('file', file)

    return fetch(this.#api, { method: 'POST', body }).then(
      r => this.#domain + key
    )
  }

  copy(origin, target) {
    var time = new Date().toGMTString()
    var headers = {
      'x-oss-date': time,
      'x-oss-copy-source': `/${this.#bucket}/${encodeURIComponent(origin)}`
    }

    return hmac(
      'SHA-1',
      str2sign('PUT', this.#bucket, {
        time,
        headers,
        key: target
      }),
      APP_KEY,
      'base64'
    )
      .then(signature =>
        fetch(`${this.#api}/${target}`, {
          method: 'PUT',
          headers: {
            authorization: `OSS ${APP_ID}:${signature}`,
            ...headers
          }
        })
      )
      .catch(e => console.log(e))
  }

  delete(key) {
    var time = new Date().toGMTString()

    return hmac(
      'SHA-1',
      `DELETE\n\n\n${time}\nx-oss-date:${time}\n/${this.#bucket}/${key}`,
      APP_KEY,
      'base64'
    ).then(signature =>
      fetch(`${this.#api}/${key}`, {
        method: 'DELETE',
        headers: {
          'content-type': void 0,
          authorization: `OSS ${APP_ID}:${signature}`,
          'x-oss-date': time
        }
      })
    )
  }
}
