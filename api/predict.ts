export const config = {
    maxDuration: 10,
};

export default async function handler(req: any, res: any) {
    // CORS Headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle Preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const page = parseInt(req.query.page);

        if (isNaN(page) || page < 1 || page > 4) {
            return res.status(400).json({ error: 'Invalid or missing page parameter' });
        }

        const ts = Date.now();
        const drawHistoryUrl = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${ts}`;

        if (page === 1) {
            // PAGE 1: PRECISION ORACLE
            const response = await fetch(drawHistoryUrl, { cache: "no-store" });
            const data = await response.json();

            if (!data?.data?.list?.length) {
                return res.status(500).json({ error: 'Failed to fetch draw data' });
            }

            const list = data.data.list;
            const latest = list[0];
            const serverPeriod = parseInt(latest.issueNumber);
            const resultNum = parseInt(latest.number);

            if (isNaN(serverPeriod) || isNaN(resultNum)) {
                return res.status(500).json({ error: 'Invalid draw data format' });
            }

            // Map history array (newest to oldest)
            const historyDB = list.map((item: any) => ({
                period: parseInt(item.issueNumber),
                num: parseInt(item.number)
            }));

            // --- PATTERN MEMORY ENGINE ---
            const analyzeHistory = (currentNum: number) => {
                if (historyDB.length < 10) return "Neutral";
                let bigCount = 0, smallCount = 0, matches = 0;
                for (let i = 1; i < historyDB.length; i++) {
                    const prevNum = historyDB[i].num;
                    const nextResult = historyDB[i - 1].num;
                    if (prevNum === currentNum) {
                        matches++;
                        if (nextResult >= 5) bigCount++;
                        else smallCount++;
                    }
                }
                if (matches === 0) return "Neutral";
                if (bigCount > smallCount) return "Big";
                if (smallCount > bigCount) return "Small";
                return "Neutral";
            };

            // --- MATH LOGIC ---
            const calculateMath = (periodStr: number, lastResultNum: number) => {
                const pDigit = parseInt(String(periodStr).slice(-1)) || 0;
                let raw = (pDigit + lastResultNum + 1);
                let final = raw % 10;
                return final >= 5 ? "Big" : "Small";
            };

            // --- NUMBER PREDICTOR ---
            const predictNumbers = (size: string, lastResultNum: number) => {
                let nums = [];
                if (size === "Big") {
                    nums.push((lastResultNum + 2) % 10);
                    nums.push(lastResultNum === 9 ? 5 : lastResultNum + 1);
                    if (nums[0] < 5) nums[0] = 9;
                } else {
                    nums.push(Math.abs(lastResultNum - 2) % 5);
                    nums.push(lastResultNum === 0 ? 4 : lastResultNum - 1);
                }
                return nums;
            };

            // Calculate Prediction for next period (serverPeriod + 1)
            const mathSig = calculateMath(serverPeriod, resultNum);
            const memSig = analyzeHistory(resultNum);

            let finalPred = "Skip";
            if (memSig === "Neutral") finalPred = mathSig;
            else if (mathSig === memSig) finalPred = mathSig;

            const predSize = finalPred === "Skip" ? mathSig : finalPred;
            const nums = predictNumbers(predSize, resultNum);

            return res.status(200).json({
                success: true,
                serverPeriod,
                resultNum,
                outcome: resultNum >= 5 ? "Big" : "Small",
                mathSig,
                memSig,
                final: finalPred,
                nums,
                history: historyDB.slice(0, 50) // Return capped history for UI logger
            });
        } 
        
        if (page === 2) {
            // PAGE 2: LIVE MINUTE CALCULATION
            const userNum = parseInt(req.query.number);
            if (isNaN(userNum) || userNum < 0 || userNum > 9) {
                return res.status(400).json({ error: 'Missing or invalid digit (0-9)' });
            }

            const currentMinute = new Date().getMinutes();
            const timeMinuteLastDigit = currentMinute % 10;

            const sum = userNum + timeMinuteLastDigit;
            const finalDigit = sum % 10;
            const outcome = (finalDigit >= 0 && finalDigit <= 4) ? 'BIG' : 'SMALL';

            return res.status(200).json({
                success: true,
                userNum,
                timeMinuteLastDigit,
                finalDigit,
                outcome
            });
        }

        if (page === 3) {
            // PAGE 3: DUAL-CORE FORMULA
            let adjustment = parseInt(req.query.offset);
            if (isNaN(adjustment)) adjustment = 0;

            const now = new Date();
            const minute = now.getMinutes();
            const hour = now.getHours();
            const M = minute % 10;
            const H = hour % 10;

            // Strategy 1: Exact Number
            let rawNum = (M - 1) + adjustment;
            let predNum = ((rawNum % 10) + 10) % 10;
            let predNumIsBig = (predNum >= 5);
            let predNumSizeText = predNumIsBig ? "BIG" : "SMALL";

            // Strategy 2: Size Only
            let sum = M + H + 2 + adjustment;
            let finalDigit = ((sum % 10) + 10) % 10;
            let strategyIsBig = (finalDigit >= 5);
            let strategySizeText = strategyIsBig ? "BIG" : "SMALL";

            const matches = (predNumSizeText === strategySizeText);

            return res.status(200).json({
                success: true,
                minute,
                hour,
                adjustment,
                predNum,
                predNumSizeText,
                strategySizeText,
                hasMatches: matches,
                signalStrength: matches ? 'STRONG SIGNAL' : 'CONFLICT',
                signalDesc: matches 
                    ? `Both formulas (with your +${adjustment} offset) agree on ${strategySizeText}.` 
                    : `Number suggests ${predNumSizeText}, but Size Formula suggests ${strategySizeText}.`
            });
        }

        if (page === 4) {
            // PAGE 4: THREE-STRATEGY CONSENSUS
            const response = await fetch(drawHistoryUrl, { cache: "no-store" });
            const data = await response.json();

            if (!data?.data?.list?.length) {
                return res.status(500).json({ error: 'Failed to fetch draw data' });
            }

            const latest = data.data.list[0];
            const serverPeriodStr = String(latest.issueNumber);
            const resultNum = parseInt(latest.number);

            if (isNaN(resultNum)) {
                return res.status(500).json({ error: 'Invalid draw data format' });
            }

            const min = new Date().getMinutes() % 10;
            const curP_LastDigit = parseInt(serverPeriodStr.slice(-1));
            const nextP_LastDigit = (curP_LastDigit + 1) % 10;

            const s1 = ((nextP_LastDigit + resultNum) % 10) >= 5 ? "Big" : "Small";

            let v2 = (resultNum * 2) + min;
            if (resultNum === 0 || resultNum === 5) v2 += 1;
            const s2 = (v2 % 10) >= 5 ? "Big" : "Small";

            const s3 = Math.abs(min - resultNum) >= 5 ? "Big" : "Small";

            // Consensus
            const bigs = [s1, s2, s3].filter(x => x === "Big").length;
            const final = bigs >= 2 ? "Big" : "Small";

            return res.status(200).json({
                success: true,
                serverPeriodStr,
                resultNum,
                outcome: resultNum >= 5 ? "Big" : "Small",
                gold: s1,
                silver: s2,
                bronze: s3,
                final
            });
        }

    } catch (error: any) {
        console.error('Prediction API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
