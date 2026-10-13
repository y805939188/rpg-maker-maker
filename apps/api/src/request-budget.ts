import type { RequestHandler } from 'express';
/** Socket/body/output admission independent of the PNG codec and JSON byte budgets. */
export function requestBudget(): RequestHandler {
  let active = 0,
    downloads = 0;
  return (req, res, next) => {
    const download = /\/builds\/[a-f0-9]{64}\/download$/.test(req.path);
    if (active >= 16 || (download && downloads >= 2)) {
      res.setHeader('Connection', 'close');
      res
        .status(429)
        .json({ error: { code: 'BUSY', message: '本地请求或下载响应槽已用尽，请稍后重试。' } });
      return;
    }
    active++;
    if (download) downloads++;
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      active--;
      if (download) downloads--;
      clearTimeout(timer);
    };
    res.once('finish', release);
    res.once('close', release);
    const timer = setTimeout(() => {
      if (!req.complete && !res.headersSent) {
        req.pause();
        res.setHeader('Connection', 'close');
        res
          .status(408)
          .json({ error: { code: 'TIMEOUT', message: 'HTTP body 读取超过 5 秒，连接已停止。' } });
      }
    }, 5000);
    req.once('end', () => clearTimeout(timer));
    req.once('aborted', () => clearTimeout(timer));
    next();
  };
}
