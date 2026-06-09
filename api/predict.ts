export const config = {
    maxDuration: 15,
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

        if (isNaN(page) || page < 1 || page > 5) {
            return res.status(400).json({ error: 'Invalid or missing page parameter' });
        }

        const ts = Date.now();
        // 30S and 1M draw API URLs
        const draw30S = `https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json?ts=${ts}&pageSize=60&pageNo=1`;
        const draw1M = `https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?ts=${ts}&pageSize=60&pageNo=1`;

        if (page === 1) {
            // PAGE 1: 80-VOTE AI (WinGo 30S)
            const response = await fetch(draw30S, { cache: "no-store" });
            const data = await response.json();

            if (!data?.data?.list?.length) {
                return res.status(500).json({ error: 'Failed to fetch draw data' });
            }

            const list = data.data.list;
            const latest = list[0];
            const serverPeriodStr = latest.issueNumber;
            const latestResultNum = parseInt(latest.number);

            // Reconstruct array from oldest to newest to train weights
            const historyList = [...list].reverse();
            const zHistory = historyList.map((item: any) => parseInt(item.number) < 5 ? 'S' : 'B');
            const nHistory = historyList.map((item: any) => parseInt(item.number));

            const get85Predictions = (n: number[], z: string[]): string[] => {
                const preds: string[] = [];
                const getNG = (d: number): string => {
                    const pat = z.slice(0, d).join('');
                    for (let i = 1; i < z.length - d; i++) {
                        if (z.slice(i, i + d).join('') === pat) return z[i - 1];
                    }
                    return z[0];
                };

                for (let i = 0; i < 10; i++) preds.push(z[i] || z[0]);

                const kValues = [3, 5, 7, 10, 15, 20, 25, 30, 40, 50];
                kValues.forEach(k => {
                    preds.push(z.slice(0, k).filter(x => x === 'B').length > k / 2 ? 'S' : 'B');
                });

                for (let d = 2; d <= 11; d++) preds.push(getNG(d));

                const n1 = n[0] || 0, n2 = n[1] || 0, n3 = n[2] || 0, n4 = n[3] || 0;
                const s1 = z[0] || 'B', s2 = z[1] || 'B', s3 = z[2] || 'B';

                preds.push(((n1 ^ n2) % 10) < 5 ? 'S' : 'B');
                preds.push(((n1 ^ n2 ^ n3) % 10) < 5 ? 'S' : 'B');
                preds.push(((n1 ^ n2 ^ n3 ^ n4) % 10) < 5 ? 'S' : 'B');
                preds.push(((n1 + n2) % 10) < 5 ? 'S' : 'B');
                preds.push((Math.abs(n1 - n2)) < 5 ? 'S' : 'B');
                preds.push(((n1 * n2) % 10) < 5 ? 'S' : 'B');
                preds.push(Math.round((n1 + n2) / 2) < 5 ? 'S' : 'B');
                preds.push(((n1 + n2 + n3) % 10) < 5 ? 'S' : 'B');
                preds.push(((n1 * 3 + n2) % 10) < 5 ? 'S' : 'B');
                preds.push(Math.floor(n1 * 1.618) % 10 < 5 ? 'S' : 'B');
                preds.push((n1 + n2) % 7 < 4 ? 'S' : 'B');
                preds.push(((n1 << 1) % 10) < 5 ? 'S' : 'B');
                preds.push((9 - n1) < 5 ? 'S' : 'B');
                preds.push(n1 > n2 ? 'B' : 'S');
                preds.push(n2 > n3 ? 'B' : 'S');

                preds.push(n1 % 2 === 0 ? 'S' : 'B');
                preds.push((n1 + n2) % 2 === 0 ? 'S' : 'B');
                preds.push(s1 !== s2 ? s1 : (s1 === 'B' ? 'S' : 'B'));
                preds.push(s1 === s2 ? (s1 === 'B' ? 'S' : 'B') : s1);
                preds.push([0, 1, 8, 9].includes(n1) ? (s1 === 'B' ? 'S' : 'B') : s1);
                preds.push([0, 5].includes(n1) || [0, 5].includes(n2) ? 'S' : 'B');
                preds.push(s1 === s2 && s2 === s3 ? (s1 === 'B' ? 'S' : 'B') : s1);
                preds.push(n1 === n2 ? (s1 === 'B' ? 'S' : 'B') : s1);
                preds.push(s1 !== s2 && s2 !== s3 ? (s1 === 'B' ? 'S' : 'B') : s1);
                preds.push(z.filter(x => x === 'B').length > z.length / 2 ? 'S' : 'B');

                for (let i = 1; i <= 30; i++) {
                    preds.push(((n1 * i + n2 * (i + 1) + n3) % 10) < 5 ? 'S' : 'B');
                }

                return preds;
            };

            // Run weight training loop on history
            let engineWeights = Array(85).fill(1);
            for (let i = 20; i < historyList.length; i++) {
                const nSlice = nHistory.slice(0, i).reverse();
                const zSlice = zHistory.slice(0, i).reverse();
                const actualSize = zHistory[i];

                const enginePreds = get85Predictions(nSlice, zSlice);
                for (let j = 0; j < 85; j++) {
                    if (enginePreds[j] === actualSize) {
                        engineWeights[j] = Math.min(engineWeights[j] + 1, 5);
                    } else {
                        engineWeights[j] = Math.max(engineWeights[j] - 1, 0);
                    }
                }
            }

            // Generate prediction for next
            const latestN = [...nHistory].reverse();
            const latestZ = [...zHistory].reverse();
            const finalEnginePreds = get85Predictions(latestN, latestZ);

            let votesB = 0;
            let votesS = 0;
            let activeWeightSum = 0;
            let activeCount = 0;

            for (let j = 0; j < 85; j++) {
                const w = engineWeights[j];
                if (w > 0) {
                    activeCount++;
                    activeWeightSum += w;
                    if (finalEnginePreds[j] === 'B') votesB += w;
                    else votesS += w;
                }
            }

            const threshold = activeWeightSum * 0.6;
            let crowdConsensus = "SKIP";
            if (votesB >= threshold) crowdConsensus = "Big";
            else if (votesS >= threshold) crowdConsensus = "Small";

            return res.status(200).json({
                success: true,
                serverPeriodStr,
                resultNum: latestResultNum,
                outcome: latestResultNum >= 5 ? "Big" : "Small",
                votesB,
                votesS,
                activeCount,
                activeWeightSum,
                crowdConsensus,
                engineWeights,
                engRes: finalEnginePreds.map((val, idx) => ({ val, w: engineWeights[idx] })),
                list: list.slice(0, 50)
            });
        }

        if (page === 2) {
            // PAGE 2: AGNI VIP (WinGo 1M)
            const response = await fetch(draw1M, { cache: "no-store" });
            const data = await response.json();

            if (!data?.data?.list?.length) {
                return res.status(500).json({ error: 'Failed to fetch draw data' });
            }

            const list = data.data.list;
            const latest = list[0];
            const serverPeriodStr = latest.issueNumber;
            const resultNum = parseInt(latest.number);

            const sizes = list.slice(0, 10).map((x: any) => parseInt(x.number) >= 5 ? "Big" : "Small");
            const last4 = sizes.slice(0, 4);
            const shape = last4.join("");

            let prediction = "WAIT";
            let reason = "follow trend";

            if (shape === "BigSmallBigSmall" || shape === "SmallBigSmallBig") {
                prediction = "WAIT";
                reason = "chaos detect";
            } else if (last4.every(x => x === "Big")) {
                const bigCount = sizes.filter(x => x === "Big").length;
                if (bigCount >= 8) {
                    prediction = "Small";
                    reason = "mean reversion";
                } else {
                    prediction = "Big";
                    reason = "trend following";
                }
            } else if (last4.every(x => x === "Small")) {
                const smallCount = sizes.filter(x => x === "Small").length;
                if (smallCount >= 8) {
                    prediction = "Big";
                    reason = "mean reversion";
                } else {
                    prediction = "Small";
                    reason = "trend following";
                }
            } else {
                const big = sizes.filter(x => x === "Big").length;
                const small = sizes.filter(x => x === "Small").length;
                if (big >= 7) {
                    prediction = "Small";
                    reason = "imbalance reversion";
                } else if (small >= 7) {
                    prediction = "Big";
                    reason = "imbalance reversion";
                } else {
                    const last6 = sizes.slice(0, 6);
                    const recentBig = last6.filter(x => x === "Big").length;
                    const recentSmall = last6.filter(x => x === "Small").length;
                    if (recentBig >= 5) {
                        prediction = "Small";
                        reason = "pressure reversion";
                    } else if (recentSmall >= 5) {
                        prediction = "Big";
                        reason = "pressure reversion";
                    } else {
                        prediction = sizes[0];
                        reason = "fallback trend";
                    }
                }
            }

            return res.status(200).json({
                success: true,
                serverPeriodStr,
                resultNum,
                outcome: resultNum >= 5 ? "Big" : "Small",
                prediction,
                reason,
                list: list.slice(0, 50)
            });
        }

        if (page === 3) {
            // PAGE 3: ULTRA GOLD (WinGo 30S)
            const response = await fetch(draw30S, { cache: "no-store" });
            const data = await response.json();

            if (!data?.data?.list?.length) {
                return res.status(500).json({ error: 'Failed to fetch draw data' });
            }

            const list = data.data.list;
            const latest = list[0];
            const serverPeriodStr = latest.issueNumber;
            const resultNum = parseInt(latest.number);

            const lastDigitOfIssue = parseInt(serverPeriodStr.slice(-1));
            const P = (resultNum + lastDigitOfIssue) % 10;
            const numbers = [
                (P - 1 + 10) % 10,
                P,
                (P + 1) % 10
            ];
            const size = P >= 5 ? 'BIG' : 'SMALL';

            return res.status(200).json({
                success: true,
                serverPeriodStr,
                resultNum,
                outcome: resultNum >= 5 ? 'BIG' : 'SMALL',
                predNumbers: numbers,
                predSize: size,
                list: list.slice(0, 50)
            });
        }

        if (page === 4) {
            // PAGE 4: 40-ALFA TOP (WinGo 30S)
            const response = await fetch(draw30S, { cache: "no-store" });
            const data = await response.json();

            if (!data?.data?.list?.length) {
                return res.status(500).json({ error: 'Failed to fetch draw data' });
            }

            const list = data.data.list;
            const latest = list[0];
            const serverPeriodStr = latest.issueNumber;
            const resultNum = parseInt(latest.number);

            const outcome = resultNum >= 5 ? 'BIG' : 'SMALL';

            return res.status(200).json({
                success: true,
                serverPeriodStr,
                resultNum,
                outcome,
                prediction: outcome,
                reason: "follow trend",
                list: list.slice(0, 50)
            });
        }

        if (page === 5) {
            // PAGE 5: HYDRA KING (WinGo 1M)
            const response = await fetch(draw1M, { cache: "no-store" });
            const data = await response.json();

            if (!data?.data?.list?.length) {
                return res.status(500).json({ error: 'Failed to fetch draw data' });
            }

            const list = data.data.list;
            const latest = list[0];
            const serverPeriodStr = latest.issueNumber;
            const resultNum = parseInt(latest.number);

            // Reconstruct array for stats and defense analysis
            const history = list.map((item: any) => parseInt(item.number)).reverse(); // oldest to newest

            const runBasePrediction = (hist: number[], prevPreds: { pred: string; win: boolean }[]) => {
                if (hist.length < 5) return 'WAIT';
                const seq = hist.map(n => n >= 5 ? 'B' : 'S');
                const lastType = seq[seq.length - 1];

                let streak = 1;
                for (let i = seq.length - 2; i >= 0; i--) {
                    if (seq[i] === lastType) streak++; else break;
                }

                let chopCount = 0;
                for (let i = seq.length - 1; i >= Math.max(1, seq.length - 5); i--) {
                    if (seq[i] !== seq[i - 1]) chopCount++;
                }
                const isChopping = chopCount >= 3;

                let nGramPred = null;
                let nGramConf = 0;

                if (seq.length >= 4) {
                    const g3 = seq.slice(-3).join('');
                    let g3Stats = { B: 0, S: 0 };
                    for (let i = 3; i < seq.length - 1; i++) {
                        if (seq.slice(i - 3, i).join('') === g3) {
                            if (seq[i] === 'B') g3Stats.B++; else g3Stats.S++;
                        }
                    }

                    if (g3Stats.B + g3Stats.S >= 2) {
                        const total = g3Stats.B + g3Stats.S;
                        const diff = Math.abs(g3Stats.B - g3Stats.S);
                        if (diff / total >= 0.6) {
                            nGramPred = g3Stats.B > g3Stats.S ? 'BIG' : 'SMALL';
                            nGramConf = (Math.max(g3Stats.B, g3Stats.S) / total) * 100;
                        }
                    }
                }

                if (!nGramPred && seq.length >= 3) {
                    const g2 = seq.slice(-2).join('');
                    let g2Stats = { B: 0, S: 0 };
                    for (let i = 2; i < seq.length - 1; i++) {
                        if (seq.slice(i - 2, i).join('') === g2) {
                            if (seq[i] === 'B') g2Stats.B++; else g2Stats.S++;
                        }
                    }
                    if (g2Stats.B + g2Stats.S >= 3) {
                        const total = g2Stats.B + g2Stats.S;
                        const diff = Math.abs(g2Stats.B - g2Stats.S);
                        if (diff / total >= 0.6) {
                            nGramPred = g2Stats.B > g2Stats.S ? 'BIG' : 'SMALL';
                            nGramConf = (Math.max(g2Stats.B, g2Stats.S) / total) * 100;
                        }
                    }
                }

                let consecutiveLosses = 0;
                for (let i = 0; i < prevPreds.length; i++) {
                    if (!prevPreds[i].win) consecutiveLosses++;
                    else break;
                }

                let finalPred = null;
                let baseConf = 50;
                let reason = "";
                let models = [];
                let isDefense = false;

                if (consecutiveLosses >= 2) {
                    const last6 = seq.slice(-6);
                    const bCount = last6.filter(x => x === 'B').length;
                    finalPred = bCount >= 3 ? 'SMALL' : 'BIG';
                    baseConf = 45;
                    reason = "⚠️ DEFENSE MODE: PRNG Noise Detected";
                    models.push("Mean Reversion");
                    isDefense = true;
                }
                else if (streak >= 3) {
                    finalPred = lastType === 'B' ? 'SMALL' : 'BIG';
                    baseConf = 65 + (streak * 5);
                    reason = `Streak Breaker (${streak}x)`;
                    models.push("Streak Breaker");
                }
                else if (isChopping) {
                    finalPred = lastType === 'B' ? 'SMALL' : 'BIG';
                    baseConf = 72;
                    reason = "Chop Rider (Alternating)";
                    models.push("Chop Rider");
                }
                else if (nGramPred) {
                    finalPred = nGramPred;
                    baseConf = nGramConf;
                    reason = `Conflict-Free N-Gram (${nGramConf.toFixed(0)}%)`;
                    models.push("N-Gram");
                }
                else {
                    finalPred = lastType === 'B' ? 'SMALL' : 'BIG';
                    baseConf = 55;
                    reason = "Baseline Reversion";
                    models.push("Baseline");
                }

                baseConf -= (consecutiveLosses * 12);
                let confidence = Math.round(Math.max(40, Math.min(88, baseConf)));

                return {
                    prediction: finalPred,
                    confidence: confidence,
                    reason: reason,
                    numbers: finalPred === 'BIG' ? [5, 6, 7, 8, 9] : [0, 1, 2, 3, 4],
                    models: models.join(', '),
                    streak: streak,
                    chop: chopCount,
                    consecutiveLosses: consecutiveLosses,
                    isDefense: isDefense
                };
            };

            // Backtest to count consecutiveLosses
            let simulatedHistoryPreds: { pred: string; win: boolean }[] = [];
            for (let i = 15; i < history.length; i++) {
                const subHistory = history.slice(0, i);
                const actualVal = history[i];
                const actualType = actualVal >= 5 ? 'BIG' : 'SMALL';
                const runResult = runBasePrediction(subHistory, simulatedHistoryPreds);
                
                if (typeof runResult === 'object' && runResult !== null && runResult.prediction !== 'WAIT') {
                    const win = (runResult.prediction === actualType);
                    simulatedHistoryPreds.unshift({ pred: runResult.prediction, win });
                }
            }

            // Get current active consecutiveLosses
            let consecutiveLosses = 0;
            for (let i = 0; i < simulatedHistoryPreds.length; i++) {
                if (!simulatedHistoryPreds[i].win) consecutiveLosses++;
                else break;
            }

            // Predict Next Period
            const predData = runBasePrediction(history, simulatedHistoryPreds);

            return res.status(200).json({
                success: true,
                serverPeriodStr,
                resultNum,
                outcome: resultNum >= 5 ? "BIG" : "SMALL",
                prediction: typeof predData === 'object' ? predData.prediction : 'WAIT',
                confidence: typeof predData === 'object' ? predData.confidence : 0,
                reason: typeof predData === 'object' ? predData.reason : 'Warming up...',
                numbers: typeof predData === 'object' ? predData.numbers : [],
                models: typeof predData === 'object' ? predData.models : 'Baseline',
                streak: typeof predData === 'object' ? predData.streak : 0,
                chop: typeof predData === 'object' ? predData.chop : 0,
                consecutiveLosses,
                isDefense: typeof predData === 'object' ? predData.isDefense : false,
                list: list.slice(0, 50)
            });
        }

    } catch (error: any) {
        console.error('Prediction API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error', details: error.message });
    }
}
