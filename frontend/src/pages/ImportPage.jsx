import { useState, useRef } from 'react'
import { api } from '../api'

export default function ImportPage() {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const inputRef = useRef(null)

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setResult(null)
    try {
      const res = await api.importExcel(file)
      setResult(res)
    } catch (e) {
      setResult({ ok: false, error: e.message })
    }
    setImporting(false)
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <h3 className="font-medium text-gray-700 mb-2">导入 Excel 历史数据</h3>
        <p className="text-sm text-gray-400 mb-4">
          上传你原来的「月视图电子手账」Excel 文件，系统会自动解析时间明细并导入。
        </p>

        {/* 文件选择 */}
        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary-300 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          {file ? (
            <div className="text-primary-600 font-medium">{file.name}</div>
          ) : (
            <div className="text-gray-400">
              <div className="text-3xl mb-2">📄</div>
              <div className="text-sm">点击选择 Excel 文件</div>
              <div className="text-xs text-gray-300 mt-1">支持 .xlsx 格式</div>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => setFile(e.target.files[0])}
          />
        </div>

        <button
          onClick={handleImport}
          disabled={!file || importing}
          className="w-full mt-4 bg-primary-500 hover:bg-primary-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
        >
          {importing ? '正在导入...' : '开始导入'}
        </button>
      </div>

      {/* 导入结果 */}
      {result && (
        <div className={`rounded-xl p-4 border ${result.ok ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {result.ok ? (
            <div>
              <div className="font-medium text-green-700 mb-1">✅ 导入成功</div>
              <div className="text-sm text-green-600">成功导入 {result.imported} 条记录</div>
              {result.total_errors > 0 && (
                <div className="text-sm text-yellow-600 mt-1">
                  {result.total_errors} 条跳过（数据异常）
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="font-medium text-red-700 mb-1">❌ 导入失败</div>
              <div className="text-sm text-red-600">{result.error || '未知错误'}</div>
            </div>
          )}
        </div>
      )}

      {/* 使用提示 */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <h4 className="text-sm font-medium text-blue-700 mb-1">💡 提示</h4>
        <ul className="text-xs text-blue-600 space-y-1">
          <li>• 上传的 Excel 需要包含名为「时间明细」的 Sheet</li>
          <li>• 列顺序需为：年、月、周、日期、主类、次类、备注、开始时间、结束时间、持续时间</li>
          <li>• 系统会自动识别并跳过空行</li>
          <li>• 导入后可以到「月视图」查看数据</li>
        </ul>
      </div>
    </div>
  )
}
