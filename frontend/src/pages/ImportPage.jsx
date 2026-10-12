import { useState, useRef } from 'react'
import { FileSpreadsheet, Download, Wrench, Loader2 } from 'lucide-react'
import { api } from '../api'

export default function ImportPage() {
  const [file, setFile] = useState(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState(null)
  const [toolMsg, setToolMsg] = useState(null)
  const [busy, setBusy] = useState('')
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

  const handleExport = async () => {
    setBusy('export')
    setToolMsg(null)
    try {
      const res = await api.exportAll()
      const blob = new Blob([JSON.stringify(res.entries, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `时间手账备份_${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setToolMsg({ ok: true, text: `已导出 ${res.count} 条记录，文件已保存到下载目录` })
    } catch (e) {
      setToolMsg({ ok: false, text: e.message })
    }
    setBusy('')
  }

  const handleRecover = async () => {
    setBusy('recover')
    setToolMsg(null)
    try {
      const res = await api.recoverData()
      setToolMsg({
        ok: true,
        text: res.moved > 0
          ? `已找回 ${res.moved} 条无归属的历史记录，请到「月视图」查看`
          : '没有发现无归属的记录，你的数据没有丢失在这里',
      })
    } catch (e) {
      setToolMsg({ ok: false, text: e.message })
    }
    setBusy('')
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
              <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 text-gray-300" strokeWidth={1.5} />
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
              <div className="font-medium text-green-700 mb-1">导入成功</div>
              <div className="text-sm text-green-600">成功导入 {result.imported} 条记录</div>
              {result.total_errors > 0 && (
                <div className="text-sm text-yellow-600 mt-1">
                  {result.total_errors} 条跳过（数据异常）
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="font-medium text-red-700 mb-1">导入失败</div>
              <div className="text-sm text-red-600">{result.error || '未知错误'}</div>
            </div>
          )}
        </div>
      )}

      {/* 数据安全 */}
      <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100">
        <h3 className="font-medium text-gray-700 mb-2">数据安全</h3>
        <p className="text-sm text-gray-400 mb-4">
          建议每隔一段时间导出一次备份。万一云端出问题，手上的文件就是后悔药。
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleExport}
            disabled={busy === 'export'}
            className="flex items-center justify-center gap-2 border border-gray-200 hover:border-primary-300 hover:text-primary-600 text-gray-600 font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {busy === 'export'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Download className="w-4 h-4" />}
            导出备份
          </button>

          <button
            onClick={handleRecover}
            disabled={busy === 'recover'}
            className="flex items-center justify-center gap-2 border border-gray-200 hover:border-primary-300 hover:text-primary-600 text-gray-600 font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {busy === 'recover'
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Wrench className="w-4 h-4" />}
            找回历史数据
          </button>
        </div>

        {toolMsg && (
          <div className={`mt-3 text-sm rounded-lg p-3 ${toolMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {toolMsg.text}
          </div>
        )}

        <p className="text-xs text-gray-400 mt-3 leading-relaxed">
          「找回历史数据」用于修复一种情况：账号编号发生变动后，早期记录失去归属、在界面上看不到。点一下即可把它们认领到当前账号。
        </p>
      </div>

      {/* 使用提示 */}
      <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
        <h4 className="text-sm font-medium text-blue-700 mb-1">使用提示</h4>
        <ul className="text-xs text-blue-600 space-y-1">
          <li>· 上传的 Excel 需要包含名为「时间明细」的 Sheet</li>
          <li>· 列顺序需为：年、月、周、日期、主类、次类、备注、开始时间、结束时间、持续时间</li>
          <li>· 系统会自动识别并跳过空行</li>
          <li>· 导入后可以到「月视图」查看数据</li>
        </ul>
      </div>
    </div>
  )
}
