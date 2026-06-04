import { patch } from '../../client/patch'

describe('patch', () => {
  it('should apply diff correctly - example 1', () => {
    // patch([0, 0], [1, 1, 3]) → [0, 3]
    expect(patch([0, 0], [1, 1, 3])).toEqual([0, 3])
  })

  it('should apply diff correctly - example 2', () => {
    // patch([0, 0], [0, 1, 2, 1]) → [2, 0]
    expect(patch([0, 0], [0, 1, 2, 1])).toEqual([2, 0])
  })

  it('should handle empty diff', () => {
    expect(patch([1, 2, 3], [])).toEqual([])
  })

  it('should handle all-matching diff', () => {
    expect(patch([1, 2, 3], [3])).toEqual([1, 2, 3])
  })

  it('should handle all-mismatching diff', () => {
    expect(patch([1, 2, 3], [0, 3, 4, 5, 6])).toEqual([4, 5, 6])
  })

  it('should handle larger maps like the game would produce', () => {
    const old = [5, 5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1]
    const diff = [2, 0, 5, 5, 1]
    const result = patch(old, diff)
    expect(result[0]).toBe(5)
    expect(result[1]).toBe(5)
    expect(result[2]).toBe(1)
  })
})
