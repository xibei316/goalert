import { getParamValues, sanitizeURLParam, Value } from './hooks'

interface GetParamTest {
  desc: string
  params: Record<string, Value>
  expected: Record<string, Value>
  search?: string
}

describe('getParamValues', () => {
  function check(x: GetParamTest): void {
    const defaultSearch = 'a=str&b=3&c=1&d=0&e=e&e=e&e=ee&f=ok%2Cgo%21'
    const mockLocationObject = {
      search: x.search ? x.search : defaultSearch,
      pathname: '',
      state: '',
      hash: '',
    }

    it(x.desc, () => {
      expect(getParamValues(mockLocationObject, x.params)).toEqual(x.expected)
    })
  }

  check({
    desc: 'empty params',
    params: {},
    expected: {},
  })

  check({
    desc: 'string value',
    params: { a: 'aaa' },
    expected: { a: 'str' },
  })

  check({
    desc: 'mising string value',
    params: { zzz: 'aaa' },
    expected: { zzz: 'aaa' },
  })

  check({
    desc: 'string multi-value',
    params: { e: ['extra'] },
    expected: { e: ['e', 'e', 'ee'] },
  })

  check({
    desc: 'missing multi-value',
    params: { zzz: ['extra'] },
    expected: { zzz: ['extra'] },
  })

  check({
    desc: 'number value 1',
    params: { b: 4 },
    expected: { b: 3 },
  })

  check({
    desc: 'number value 2',
    params: { c: 4 },
    expected: { c: 1 },
  })

  check({
    desc: 'number value 3',
    params: { d: 4 },
    expected: { d: 0 },
  })

  check({
    desc: 'missing number value',
    params: { zzz: 4 },
    expected: { zzz: 4 },
  })

  check({
    desc: 'bool value (true)',
    params: { c: false },
    expected: { c: true },
  })

  check({
    desc: 'bool value (false)',
    params: { d: false },
    expected: { d: false },
  })

  check({
    desc: 'missing bool value',
    params: { zzz: true },
    expected: { zzz: true },
  })

  check({
    desc: 'multi param',
    params: { a: '', b: 0, e: [], zzz: false },
    expected: { a: 'str', b: 3, e: ['e', 'e', 'ee'], zzz: false },
  })

  check({
    desc: 'char encoding 1',
    params: { f: '' },
    expected: { f: 'ok,go!' },
  })

  check({
    desc: 'char encoding 2',
    search: 'search=asdf%26%3D',
    params: { search: '' },
    expected: { search: 'asdf&=' },
  })

  check({
    desc: 'search foo',
    search: 'search=foo',
    params: { search: '' },
    expected: { search: 'foo' },
  })

  check({
    desc: '& prefix',
    search: '&search=foo',
    params: { search: '' },
    expected: { search: 'foo' },
  })

  check({
    desc: '&&& suffix',
    search: 'search=foo&&&',
    params: { search: '' },
    expected: { search: 'foo' },
  })
})

interface SanitizeTest {
  desc: string
  val: Value
  expected: string | string[]
}

describe('sanitizeURLParam', () => {
  function check(x: SanitizeTest): void {
    it(x.desc, () => {
      expect(sanitizeURLParam(x.val)).toEqual(x.expected)
    })
  }

  check({
    desc: 'string value',
    val: 'str',
    expected: 'str',
  })

  check({
    desc: 'empty string',
    val: '',
    expected: '',
  })

  check({
    desc: 'trim string',
    val: '  ',
    expected: '',
  })

  check({
    desc: 'multi string',
    val: [' hello', '', ' world ', '   '],
    expected: ['hello', 'world'],
  })

  check({
    desc: 'bool value true',
    val: true,
    expected: '1',
  })

  check({
    desc: 'bool value false',
    val: false,
    expected: '',
  })

  check({
    desc: 'num value 1',
    val: 1,
    expected: '1',
  })

  check({
    desc: 'num value 0',
    val: 0,
    expected: '0',
  })
})
