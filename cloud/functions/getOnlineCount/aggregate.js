/**
 * 把云数据库聚合的输出转成客户端契约的形状。
 *
 * 聚合返回的是 `[{ _id: '广东', count: 11 }]`，而客户端要的是
 * `[{ province: '广东', count: 11 }]`（见 src/cloud/types.ts 的 ProvincePresence）。
 *
 * 单独成文件是为了能直接单测 —— 云函数里其余部分都依赖 wx-server-sdk，跑不起来。
 */

/**
 * @param {Array<{_id: string, count: number}>} list 聚合结果
 * @returns {Array<{province: string, count: number}>} 按人数降序
 */
function toProvinceList(list) {
  if (!Array.isArray(list))
    return []

  return list
    // _id 为空的分组要丢掉：province 字段缺失的文档本该被 match 过滤掉，
    // 但万一漏进来，空名字在前端查不到坐标，留着只是噪音
    .filter(row => row && typeof row._id === 'string' && row._id && Number(row.count) > 0)
    .map(row => ({ province: row._id, count: Number(row.count) }))
    // 降序只是为了日志和排查时好读，前端不依赖顺序
    .sort((a, b) => b.count - a.count)
}

module.exports = { toProvinceList }
