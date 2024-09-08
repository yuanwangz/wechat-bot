import { requestPromise } from './req.js'; // 替换为实际的路径

// get_news函数，处理API返回的数据
export async function get_news(msgContent) {
    let url = '';
    if (msgContent == "/微博热搜") {
        url = "https://www.anyknew.com/api/v1/sites/weibo";
    } else if (msgContent == "/知乎热搜") {
        url = "https://www.anyknew.com/api/v1/sites/zhihu";
    } else if (msgContent == "/头条热搜") {
        url = "https://www.anyknew.com/api/v1/sites/toutiao";
    } else if (msgContent == "/36氪热搜") {
        url = "https://www.anyknew.com/api/v1/sites/36kr";
    } else if (msgContent == "/网易新闻热搜") {
        url = "https://www.anyknew.com/api/v1/sites/163";
    } else if (msgContent == "/百度热搜") {
        url = "https://www.anyknew.com/api/v1/sites/baidu";
    } else if (msgContent == "/v2ex热搜") {
        url = "https://www.anyknew.com/api/v1/sites/v2ex";
    } else if (msgContent == "/雪球热搜") {
        url = "https://www.anyknew.com/api/v1/sites/xueqiu";
    } else if (msgContent == "/东方财富热搜") {
        url = "https://www.anyknew.com/api/v1/sites/eastmoney";
    }

    try {
        // 使用封装的 requestPromise 发起请求
        const response = await requestPromise({ url, method: 'GET' });
        const responseData = response.data;

        let res = '';
        let count = 1;

        // 遍历subs数组中的每个子项
        for (const sub of responseData.data.site.subs) {
            for (const item of sub.items) {
                if (count > 10) break;
                // 将Unix时间戳转换为JavaScript的日期格式
                const t = new Date(item.add_date * 1000);
                // 检查是否有 "热度"
                const heat = item.more ? `   热度: ${item.more}` : '';
                // 拼接结果字符串
                // res += `${count}. ${item.title} [${t.toISOString().replace('T', ' ').substring(0, 19)}]${heat}\nhttps://www.anyknew.com/go/${item.iid}\n\n`;
                res += `${count}. ${item.title} ${heat}\nhttps://www.anyknew.com/go/${item.iid}\n`;
                count++;
            }
        }
        return res;
    } catch (error) {
        console.error(error);
        return '';
    }
}