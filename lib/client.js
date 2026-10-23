window.__ModuleLoader__.load({
	id: "dsh-offpeak",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/badge-text.ts
		/** 阶段文案。 */
		const PHASE_LABELS = {
			peak: "高峰",
			"off-peak": "谷时",
			weekend: "周末"
		};
		/**
		* 徽标文案：
		*   - 非高峰 → 阶段文案（谷时 / 周末）；
		*   - 高峰 + 有畅跑任务 → `高峰 · 畅跑中`；
		*   - 高峰 + 有拦截任务 → `高峰 · 拦截中`；
		*   - 高峰 + 都没任务 → `高峰`。
		*
		* 畅跑优先于拦截：畅跑是「本会话无视峰谷照常跑」，比「有拦截规则」更直接地描述此刻状态。
		*/
		function peakLabel(status, tasks = {}) {
			if (status.phase !== "peak") return PHASE_LABELS[status.phase];
			if (tasks.freeRun === true) return "高峰 · 畅跑中";
			if (tasks.intercepting === true) return "高峰 · 拦截中";
			return "高峰";
		}
		/**
		* 徽标的 CSS 类：**每个阶段都是同一个按钮**（`sg-status sg-status-btn` + 配色变体）。
		*
		* 这条不变量要钉住：高峰（拦截）与谷时/周末（放行）**只有文案与颜色变**，交互形态一致 ——
		* 都是可点击按钮，点开同一个面板，绝不因为不是高峰就退化成不可点的展示元素。
		*/
		function badgeClassNames(status) {
			return `sg-status sg-status-btn ${status.phase === "peak" ? "sg-peak" : status.phase === "weekend" ? "sg-weekend" : "sg-off"}`;
		}
		/** 周末天数文案（缺省与内置一致）。 */
		function weekendDaysText(status) {
			return (Array.isArray(status.weekendDays) && status.weekendDays.length > 0 ? status.weekendDays : ["sat", "sun"]).join("、");
		}
		/**
		* hover 卡片文案：**完全按用户当前配置生成**（来源判定开关 + 名单、拦截列表、高峰时段、
		* 周末规则），并写入当前挂起/延后计数。不含 step（能力已移除），不写死 provider 品牌名。
		*/
		function badgeTip(status, times = {}) {
			const tz = status.timezone === "" ? "本地时区" : status.timezone;
			const label = PHASE_LABELS[status.phase];
			const peak = status.phase === "peak";
			const summary = typeof times.peakSummary === "string" && times.peakSummary !== "" ? times.peakSummary : "";
			const current = typeof times.currentWindow === "string" && times.currentWindow !== "" ? times.currentWindow : "";
			const notes = [];
			let headline = `${label} · ${tz}`;
			let models;
			if (peak) {
				if (current !== "") headline = `${headline} · 当前窗口 ${current}`;
				if (status.providerGuard === true) {
					models = Array.isArray(status.officialModelPatterns) ? [...status.officialModelPatterns] : [];
					notes.push("其它来源照常放行");
				} else notes.push("未启用来源判定：入峰暂停全部会话、请求不拦");
				if (summary !== "") notes.push(`全部高峰时段 ${summary}`);
			} else {
				notes.push("请求全部放行");
				if (summary !== "") notes.push(`高峰时段 ${summary}`);
				if (status.weekendMode === true) notes.push(`周末整日谷时（${weekendDaysText(status)}）`);
				else notes.push("周末不豁免（按高峰时段判定）");
			}
			const nextPeak = typeof times.nextPeak === "string" && times.nextPeak !== "" ? times.nextPeak : "";
			if (nextPeak !== "") notes.push(`下一段高峰 ${nextPeak}`);
			const held = status.held ?? 0;
			const deferred = status.deferred ?? 0;
			const counters = held > 0 || deferred > 0 ? `挂起请求 ${held} · 延后待恢复 ${deferred}` : null;
			return {
				headline,
				models,
				notes,
				counters,
				hint: "点击展开/收起高峰面板"
			};
		}
		/** 卡片内容的纯文本版（徽标按钮的 `aria-label` 用；卡片本身 aria-hidden）。 */
		function tipText(tip) {
			const parts = [tip.headline];
			if (tip.models !== void 0) {
				const list = tip.models.length > 0 ? tip.models.join("、") : "未设置拦截模型";
				parts.push(`拦截列表【${list}】`);
			}
			for (const note of tip.notes) parts.push(note);
			if (tip.counters !== null) parts.push(tip.counters);
			parts.push(tip.hint);
			return parts.join("；");
		}
		//#endregion
		//#region src/client/badge-tip.tsx
		/** 【】里滚动展示的拦截模型列表（同一串内容复制两份做无缝循环）。 */
		function ModelsMarquee({ models }) {
			if (models.length === 0) return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "sg-tip-empty",
				children: "未设置拦截模型"
			});
			const text = models.join("、");
			return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
				className: "sg-tip-models",
				children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
					className: "sg-tip-track",
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: text }),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "sg-tip-sep",
							"aria-hidden": "true",
							children: "／／"
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": "true",
							children: text
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "sg-tip-sep",
							"aria-hidden": "true",
							children: "／／"
						})
					]
				})
			});
		}
		function BadgeTipCard({ tip }) {
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sg-tip",
				role: "tooltip",
				"aria-hidden": "true",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sg-tip-headline",
						children: tip.headline
					}),
					tip.models !== void 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sg-tip-line",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "拦截列表" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "sg-tip-bracket",
								children: "【"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelsMarquee, { models: tip.models }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "sg-tip-bracket",
								children: "】"
							})
						]
					}),
					tip.notes.map((note) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sg-tip-line",
						children: note
					}, note)),
					tip.counters !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sg-tip-line",
						children: tip.counters
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sg-tip-hint",
						children: tip.hint
					})
				]
			});
		}
		//#endregion
		//#region src/client/free-run-button-text.ts
		/** 空视图（请求失败 / 未加载时的安全默认）。 */
		const EMPTY_FREE_RUN = {
			state: "none",
			active: false,
			available: false,
			timezone: "",
			windows: [],
			activeId: null,
			msRemaining: null,
			nextStartMs: null,
			nextStartDisplay: null
		};
		/** 单段状态标签。 */
		function statusLabel(status) {
			if (status === "active") return "进行中";
			if (status === "paused") return "已暂停";
			if (status === "scheduled") return "待开始";
			return "已结束";
		}
		/** 该行是否显示「暂停」图标（已结束的段无从暂停）。 */
		function canPause(w) {
			return w.status !== "ended" && w.paused !== true;
		}
		/** 该行是否显示「恢复」图标。 */
		function canResume(w) {
			return w.status !== "ended" && w.paused === true;
		}
		/** 未结束（可操作）的任务。 */
		function liveWindows(view) {
			return (view?.windows ?? []).filter((w) => w.status !== "ended");
		}
		/** 是否所有未结束的任务都已被暂停（决定顶部按钮显示「暂停全部任务」还是「恢复全部任务」）。 */
		function allTasksPaused(view) {
			const live = liveWindows(view);
			return live.length > 0 && live.every((w) => w.paused === true);
		}
		/** 顶部第二个文本按钮的文案。 */
		function pauseAllLabel(view) {
			return allTasksPaused(view) ? "恢复全部任务" : "暂停全部任务";
		}
		/** 顶部三个文本按钮是否可用（没有任务时后两个禁用）。 */
		function toolbarDisabled(view) {
			return liveWindows(view).length === 0;
		}
		/**
		* 图标字形。带 `\uFE0E`（text presentation）强制按文字渲染，
		* 避免 `⏸` 在部分平台被渲染成彩色 emoji。零图标库依赖。
		*/
		const ICON_PAUSE = "⏸︎";
		const ICON_RESUME = "▶︎";
		/** v3.3.0：窄宽度下只显示图标的按钮（文字标签由 CSS 隐藏）。 */
		const ICON_ADD = "＋︎";
		const ICON_REFRESH = "⟳︎";
		const ICON_RELOAD = "↻︎";
		const ICON_CHECK = "☑︎";
		/** 每行暂停 / 恢复图标按钮的悬浮提示。 */
		function rowPauseTitle(w) {
			return w.paused === true ? "恢复这一段畅跑" : "暂停这一段畅跑（其他段不受影响）";
		}
		/** 每行删除图标按钮的悬浮提示。 */
		function rowDeleteTitle() {
			return "删除这一段畅跑";
		}
		/** 从 `/session-guard/state` 响应体里取出 `freeRun`（形状异常 → 安全空视图）。 */
		function readFreeRun(body) {
			const b = body ?? {};
			if (b.ok !== true) return EMPTY_FREE_RUN;
			const f = b.freeRun;
			if (f === null || typeof f !== "object") return EMPTY_FREE_RUN;
			const raw = f;
			const windows = Array.isArray(raw.windows) ? raw.windows.filter((w) => w !== null && typeof w === "object") : [];
			return {
				state: typeof raw.state === "string" ? raw.state : "none",
				active: raw.active === true,
				available: raw.available === true,
				timezone: typeof raw.timezone === "string" ? raw.timezone : "",
				windows,
				activeId: typeof raw.activeId === "string" ? raw.activeId : null,
				msRemaining: typeof raw.msRemaining === "number" ? raw.msRemaining : null,
				nextStartMs: typeof raw.nextStartMs === "number" ? raw.nextStartMs : null,
				nextStartDisplay: typeof raw.nextStartDisplay === "string" ? raw.nextStartDisplay : null
			};
		}
		//#endregion
		//#region src/client/date-range.ts
		const WEEKDAY_LABELS = [
			"一",
			"二",
			"三",
			"四",
			"五",
			"六",
			"日"
		];
		/** 周一到周日的表头。 */
		function weekdayLabels() {
			return [...WEEKDAY_LABELS];
		}
		/** 两位补零。 */
		function pad2(n) {
			return String(n).padStart(2, "0");
		}
		/** `Ymd` → `YYYY-MM-DD`。 */
		function toIso({ y, m, d }) {
			return `${y}-${pad2(m)}-${pad2(d)}`;
		}
		/** `YYYY-MM-DD` → `Ymd`；非法返回 null。 */
		function fromIso(value) {
			const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof value === "string" ? value : "");
			if (m === null) return null;
			const y = Number(m[1]);
			const mo = Number(m[2]);
			const d = Number(m[3]);
			if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
			return {
				y,
				m: mo,
				d
			};
		}
		/** 该月天数（用「下个月 0 号」拿到，天然处理闰年）。 */
		function daysInMonth(y, m) {
			return new Date(y, m, 0).getDate();
		}
		/** 该月 1 号是周几（0=周日…6=周六）。 */
		function firstWeekday(y, m) {
			return new Date(y, m - 1, 1).getDay();
		}
		/** 月份偏移（可跨年）。 */
		function addMonths({ y, m }, delta) {
			const total = y * 12 + (m - 1) + delta;
			return {
				y: Math.floor(total / 12),
				m: total % 12 + 1
			};
		}
		/**
		* 该月的日历网格：周一开头，长度固定为 7 的倍数（可能 5 或 6 周）。
		* 非本月的格子用 `inMonth: false` 标出（界面上淡显）。
		*/
		function monthGrid(y, m) {
			const lead = (firstWeekday(y, m) + 6) % 7;
			const total = daysInMonth(y, m);
			const cells = [];
			const prev = addMonths({
				y,
				m
			}, -1);
			const prevTotal = daysInMonth(prev.y, prev.m);
			for (let i = lead - 1; i >= 0; i -= 1) {
				const d = prevTotal - i;
				cells.push({
					day: d,
					iso: toIso({
						y: prev.y,
						m: prev.m,
						d
					}),
					inMonth: false
				});
			}
			for (let d = 1; d <= total; d += 1) cells.push({
				day: d,
				iso: toIso({
					y,
					m,
					d
				}),
				inMonth: true
			});
			const next = addMonths({
				y,
				m
			}, 1);
			let d = 1;
			while (cells.length % 7 !== 0) {
				cells.push({
					day: d,
					iso: toIso({
						y: next.y,
						m: next.m,
						d
					}),
					inMonth: false
				});
				d += 1;
			}
			return cells;
		}
		/** 月份标题，如 `2026年 9月`。 */
		function monthTitle(y, m) {
			return `${y}年 ${m}月`;
		}
		/** 日期先后比较：a<b → -1，相等 → 0，a>b → 1（字符串直接比即可，形态定长）。 */
		function compareIso(a, b) {
			if (a === b) return 0;
			return a < b ? -1 : 1;
		}
		/** 该日是否落在 `[from, to]` 闭区间内（任一端为空则不算命中）。 */
		function inRange(iso, from, to) {
			if (from === "" || to === "") return false;
			const [lo, hi] = compareIso(from, to) <= 0 ? [from, to] : [to, from];
			return compareIso(iso, lo) >= 0 && compareIso(iso, hi) <= 0;
		}
		/** 是否区间的端点。 */
		function isEdge(iso, from, to) {
			return iso === from || iso === to;
		}
		/** 把「日期 + 小时」拼成主机要的墙钟串（按配置时区解释）：开始 = `H:00`。 */
		function combineStart(date, hour) {
			return `${date}T${pad2(Number(hour))}:00`;
		}
		/** 把「日期 + 小时」拼成主机要的墙钟串：结束 = `H:59`（含该小时）。 */
		function combineEnd(date, hour) {
			return `${date}T${pad2(Number(hour))}:${pad2(59)}`;
		}
		/**
		* 默认区间：**开始 = 当前时刻**（本小时整点），结束 = 下一个小时（按上面的「含该小时」
		* 语义即覆盖 2 个自然小时；跨天/跨月/跨年会顺延到下一天）。
		*
		* 与用户要求一致：「默认开始时间是当前时刻」。返回 `YYYY-MM-DD` 与 `HH` 四段，
		* 直接喂给日历 + 小时下拉。
		*/
		function seedRange(now) {
			const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), 0, 0, 0);
			const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1, 0, 0, 0);
			return {
				fromDate: toIso({
					y: start.getFullYear(),
					m: start.getMonth() + 1,
					d: start.getDate()
				}),
				fromHour: pad2(start.getHours()),
				toDate: toIso({
					y: end.getFullYear(),
					m: end.getMonth() + 1,
					d: end.getDate()
				}),
				toHour: pad2(end.getHours())
			};
		}
		/**
		* 一次点击后的范围状态机：
		* - 还没选起点，或已有完整区间 → 该点成为**新起点**，终点清空（等待第二次点击）；
		* - 已有起点、没有终点 → 该点成为终点；若它在起点之前，则两者对调（允许反着选）。
		*/
		function nextRange(from, to, picked) {
			if (from === "" || to !== "") return {
				from: picked,
				to: "",
				done: false
			};
			return compareIso(picked, from) >= 0 ? {
				from,
				to: picked,
				done: true
			} : {
				from: picked,
				to: from,
				done: true
			};
		}
		/** 触发器上显示的区间文案（未选满时给占位）。 */
		function rangeLabel(from, to) {
			if (from !== "" && to !== "") return {
				text: `${from} → ${to}`,
				placeholder: false
			};
			if (from !== "") return {
				text: `${from} → 结束日期`,
				placeholder: true
			};
			return {
				text: "开始日期 → 结束日期",
				placeholder: true
			};
		}
		//#endregion
		//#region src/client/date-range-picker.tsx
		/**
		* dsh-offpeak — 日期范围选择器（双月日历，风格对齐 DSH 排期面板）。
		*
		* 交互：
		* - 触发器是一行 `开始日期 → 结束日期` + 日历图标；
		* - 点开后是两个并排月份，`‹‹ ‹  2026年 9月   2026年 10月  › ››`；
		* - 第一次点选起点、第二次点选终点（反着点会自动对调）；选满即收起；
		* - 已有完整区间时再点一次 = 重新开始选。
		*
		* 只有日期；**小时**由调用方在日历旁另配下拉（保持「到小时」的精度）。
		* 纯展示 + 受控回调，不做校验（非法组合由主机侧拒绝并回报错误）。
		*/
		/** 双月范围日历。 */
		function DateRangePicker({ from, to, onChange, disabled = false }) {
			const [open, setOpen] = (0, react.useState)(false);
			const todayIso = seedRange(/* @__PURE__ */ new Date()).fromDate;
			const [anchor, setAnchor] = (0, react.useState)(() => {
				const seed = fromIso(from) ?? fromIso(to) ?? fromIso(todayIso);
				return {
					y: seed.y,
					m: seed.m
				};
			});
			const rootRef = (0, react.useRef)(null);
			(0, react.useEffect)(() => {
				const seed = fromIso(from) ?? fromIso(to);
				if (seed !== null && open) setAnchor({
					y: seed.y,
					m: seed.m
				});
			}, [open]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onDown = (ev) => {
					const el = rootRef.current;
					if (el !== null && ev.target instanceof Node && !el.contains(ev.target)) setOpen(false);
				};
				const onKey = (ev) => {
					if (ev.key === "Escape") setOpen(false);
				};
				document.addEventListener("mousedown", onDown);
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("mousedown", onDown);
					document.removeEventListener("keydown", onKey);
				};
			}, [open]);
			const label = rangeLabel(from, to);
			const right = addMonths(anchor, 1);
			function pick(iso) {
				const r = nextRange(from, to, iso);
				onChange(r.from, r.to);
				if (r.done) setOpen(false);
			}
			function cellClass(iso, inMonth) {
				const parts = ["sg-dr-day"];
				if (!inMonth) parts.push("sg-dr-out");
				if (inRange(iso, from, to)) parts.push("sg-dr-in");
				if (isEdge(iso, from, to) && compareIso(from, to) !== 0) parts.push("sg-dr-edge");
				else if (isEdge(iso, from, to)) parts.push("sg-dr-edge", "sg-dr-single");
				if (iso === todayIso) parts.push("sg-dr-today");
				return parts.join(" ");
			}
			function renderMonth(y, m) {
				const cells = monthGrid(y, m);
				return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "sg-dr-month",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sg-dr-mtitle",
						children: monthTitle(y, m)
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sg-dr-grid",
						children: [weekdayLabels().map((w) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "sg-dr-wd",
							children: w
						}, w)), cells.map((c) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: cellClass(c.iso, c.inMonth),
							disabled,
							onClick: () => pick(c.iso),
							children: c.day
						}, c.iso))]
					})]
				});
			}
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sg-dr-root",
				ref: rootRef,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: `sg-dr-trigger ${label.placeholder ? "sg-dr-ph" : ""}`,
					disabled,
					"aria-expanded": open,
					onClick: () => setOpen((p) => !p),
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "sg-dr-text",
						children: label.text
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: "sg-dr-icon",
						"aria-hidden": "true",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("svg", {
							width: "14",
							height: "14",
							viewBox: "0 0 16 16",
							fill: "none",
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("rect", {
								x: "2",
								y: "3",
								width: "12",
								height: "11",
								rx: "2",
								stroke: "currentColor",
								strokeWidth: "1.3"
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("path", {
								d: "M2 6.5h12M5.5 2v2.5M10.5 2v2.5",
								stroke: "currentColor",
								strokeWidth: "1.3",
								strokeLinecap: "round"
							})]
						})
					})]
				}), open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: "sg-dr-panel",
					role: "dialog",
					"aria-label": "选择日期范围",
					children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sg-dr-head",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "sg-dr-nav",
								title: "上一年",
								onClick: () => setAnchor((a) => addMonths(a, -12)),
								children: "‹‹"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "sg-dr-nav",
								title: "上个月",
								onClick: () => setAnchor((a) => addMonths(a, -1)),
								children: "‹"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { className: "sg-dr-spacer" }),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "sg-dr-nav",
								title: "下个月",
								onClick: () => setAnchor((a) => addMonths(a, 1)),
								children: "›"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "sg-dr-nav",
								title: "下一年",
								onClick: () => setAnchor((a) => addMonths(a, 12)),
								children: "››"
							})
						]
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sg-dr-months",
						children: [renderMonth(anchor.y, anchor.m), renderMonth(right.y, right.m)]
					})]
				})]
			});
		}
		//#endregion
		//#region src/client/tz.ts
		/**
		* dsh-offpeak — 显示时区换算（纯函数，零依赖，可单测）。
		*
		* 约定：配置里的峰谷时间（`peakPolicy.peakWindows[].start/end`）是**策略时区的墙钟**；
		* 面板允许用户另选一个「显示时区」，只影响展示，配置文件里的原始值不动。
		* 本模块负责「墙钟 → 绝对时刻 → 目标时区墙钟」的换算与格式化。
		*/
		/** IANA 时区是否可用（Intl 能构造即为可用）。 */
		function isValidTimeZone(tz) {
			if (typeof tz !== "string" || tz.trim() === "") return false;
			try {
				new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(/* @__PURE__ */ new Date());
				return true;
			} catch {
				return false;
			}
		}
		/** `HH:MM` → 时/分；非法返回 null。 */
		function parseHHMM(hhmm) {
			const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm ?? "").trim());
			if (m === null) return null;
			const hour = Number(m[1]);
			const minute = Number(m[2]);
			if (!Number.isInteger(hour) || hour < 0 || hour > 23) return null;
			if (!Number.isInteger(minute) || minute < 0 || minute > 59) return null;
			return {
				hour,
				minute
			};
		}
		/** 某绝对时刻在指定时区下的墙钟部件。 */
		function zonedParts(ms, tz) {
			const f = new Intl.DateTimeFormat("en-CA", {
				timeZone: tz,
				hourCycle: "h23",
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
				hour: "2-digit",
				minute: "2-digit"
			});
			const p = {};
			for (const part of f.formatToParts(new Date(ms))) p[part.type] = part.value;
			return {
				year: Number(p.year),
				month: Number(p.month),
				day: Number(p.day),
				hour: Number(p.hour),
				minute: Number(p.minute)
			};
		}
		/**
		* 把「`tz` 时区里 `ref` 当天的 `hh:mm`」换算成绝对时刻（毫秒）。
		*
		* 做法：先当成 UTC 猜一个时刻，再用该时刻在 `tz` 下的墙钟与猜测的差修正一次
		* （一次迭代即可覆盖常规偏移与换季；DST 跳变的那一小时本身存在歧义，取修正后结果）。
		*/
		function wallClockToInstant(tz, hhmm, ref = /* @__PURE__ */ new Date()) {
			const p = parseHHMM(hhmm);
			if (p === null || !isValidTimeZone(tz)) return null;
			const base = zonedParts(ref.getTime(), tz);
			const guess = Date.UTC(base.year, base.month - 1, base.day, p.hour, p.minute);
			const got = zonedParts(guess, tz);
			return guess - (Date.UTC(got.year, got.month - 1, got.day, got.hour, got.minute) - guess);
		}
		/** 绝对时刻 → 指定时区的 `HH:MM`。 */
		function formatHHMM(ms, tz) {
			const p = zonedParts(ms, tz);
			return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
		}
		/** 绝对时刻 → 指定时区的 `MM-DD HH:MM`。 */
		function formatInstant(isoOrMs, tz) {
			const ms = typeof isoOrMs === "number" ? isoOrMs : Date.parse(String(isoOrMs));
			if (!Number.isFinite(ms) || !isValidTimeZone(tz)) return "";
			const p = zonedParts(ms, tz);
			return `${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")} ${formatHHMM(ms, tz)}`;
		}
		/** 绝对时刻区间 → 显示时区下的 `MM-DD HH:MM – MM-DD HH:MM`。 */
		function formatInstantRange(from, to, displayTz) {
			const a = formatInstant(from, displayTz);
			const b = formatInstant(to, displayTz);
			if (a === "" || b === "") return "";
			return `${a} – ${b}`;
		}
		/**
		* 单个峰窗口 → 显示时区文本：`09:00–12:00`；结束时刻落到第二天时补 `（+1 天）`。
		* 策略时区等于显示时区时不做任何换算，原样输出（避免无谓的 Intl 解析）。
		*/
		function formatWindow(start, end, policyTz, displayTz, ref = /* @__PURE__ */ new Date()) {
			const raw = `${start}–${end}`;
			if (policyTz === displayTz || !isValidTimeZone(displayTz) || !isValidTimeZone(policyTz)) return raw;
			const startMs = wallClockToInstant(policyTz, start, ref);
			const endMsRaw = wallClockToInstant(policyTz, end, ref);
			if (startMs === null || endMsRaw === null) return raw;
			const endMs = end <= start ? endMsRaw + 864e5 : endMsRaw;
			const s = zonedParts(startMs, displayTz);
			const e = zonedParts(endMs, displayTz);
			const startDay = Date.UTC(s.year, s.month - 1, s.day);
			const endDay = Date.UTC(e.year, e.month - 1, e.day);
			const shiftDays = Math.round((endDay - startDay) / 864e5);
			const suffix = shiftDays > 0 ? `（+${shiftDays} 天）` : shiftDays < 0 ? `（-${Math.abs(shiftDays)} 天）` : "";
			return `${formatHHMM(startMs, displayTz)}–${formatHHMM(endMs, displayTz)}${suffix}`;
		}
		/** 多窗口摘要：`09:00–12:00 / 14:00–18:00`。 */
		function formatWindows(windows, policyTz, displayTz, ref = /* @__PURE__ */ new Date()) {
			if (!Array.isArray(windows) || windows.length === 0) return "";
			return windows.map((w) => formatWindow(w.start, w.end, policyTz, displayTz, ref)).join(" / ");
		}
		/** 旧运行时的兜底短名单（无 `Intl.supportedValuesOf` 时用）。 */
		const COMMON_TIMEZONES = [
			"Asia/Shanghai",
			"Asia/Tokyo",
			"Asia/Singapore",
			"Asia/Kolkata",
			"Europe/London",
			"Europe/Berlin",
			"America/New_York",
			"America/Los_Angeles",
			"UTC"
		];
		/**
		* 完整的 IANA 时区清单（国际标准，约 400+ 个）。
		*
		* 优先用 `Intl.supportedValuesOf('timeZone')` —— 运行时 tz database 的标准枚举；
		* 老运行时没有该 API 时退回上面的短名单。`UTC` 不在 V8 的枚举结果里，显式补上。
		*/
		const IANA_TIMEZONES = (() => {
			try {
				const supported = Intl.supportedValuesOf;
				if (typeof supported === "function") {
					const list = supported("timeZone");
					if (Array.isArray(list) && list.length > 0) {
						const out = list.filter((zone) => typeof zone === "string" && zone !== "");
						if (!out.includes("UTC")) out.unshift("UTC");
						return out;
					}
				}
			} catch {}
			return [...COMMON_TIMEZONES];
		})();
		/** 显示时区偏好的 localStorage 键。 */
		const DISPLAY_TZ_KEY = "offpeak.displayTz";
		/** 显示时区：非法/为空 → 回退到给定值；回退值也非法 → UTC。 */
		function normalizeDisplayTz(value, fallback) {
			const s = typeof value === "string" ? value.trim() : "";
			if (s !== "" && isValidTimeZone(s)) return s;
			return isValidTimeZone(fallback) ? fallback : "UTC";
		}
		/** 读显示时区偏好：没有存过 / 非法 / 读写异常 → 返回空串（调用方用策略时区兜底）。 */
		function readDisplayTz() {
			try {
				if (typeof localStorage === "undefined") return "";
				const raw = localStorage.getItem(DISPLAY_TZ_KEY);
				return typeof raw === "string" && isValidTimeZone(raw.trim()) ? raw.trim() : "";
			} catch {
				return "";
			}
		}
		/** 写显示时区偏好（失败静默：只是偏好）。 */
		function writeDisplayTz(tz) {
			try {
				if (typeof localStorage === "undefined") return;
				localStorage.setItem(DISPLAY_TZ_KEY, tz);
			} catch {}
		}
		//#endregion
		//#region src/client/styles.ts
		/**
		* dsh-offpeak — 客户端样式（与 composer 右侧 input-traffic 冻结按钮同一视觉语言）。
		*
		* 为什么注入 `<style>` 而不是 CSS Modules：本插件的 tsdown 配置没有 CSS Modules 管线
		* （input-traffic 有），而 settings-card 已经用 `<style data-plugin-css>` 的既有约定。
		*
		* 覆盖两块：
		* - 「畅跑」按钮（四态：默认 / 畅跑中 / 畅跑暂停）与状态徽标，对齐到同一行的其它控件
		*   （高度 24px、圆角 6px、12px 字号、同样的 border / hover 令牌）；
		* - 畅跑任务的**管理弹层**（列表 + 日期/小时选择器 + 操作按钮），同样只用原生控件。
		*/
		/** 与 `dsh-input-traffic/src/client/freeze-button.module.css` 对齐的控件外观。 */
		const CLIENT_CSS = `
.sg-fr-root{position:relative;display:inline-flex;flex:none}
.sg-fr{display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px;line-height:1;cursor:pointer;white-space:nowrap;flex:none}
.sg-fr:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.04))}
.sg-fr:disabled{opacity:.55;cursor:default}
.sg-fr[aria-pressed='true'],.sg-fr-active{border-color:var(--dsw-alias-state-success-primary,#30a46c);color:var(--dsw-alias-state-success-primary,#30a46c);background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#30a46c) 8%,transparent)}
.sg-fr-suspended{border-color:var(--dsw-alias-state-warning-primary,#d97706);color:var(--dsw-alias-state-warning-primary,#d97706);background:color-mix(in srgb,var(--dsw-alias-state-warning-primary,#d97706) 8%,transparent)}
.sg-status{display:inline-flex;align-items:center;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:transparent;font-size:12px;line-height:1;color:var(--dsw-alias-label-secondary,#6b7280);white-space:nowrap;flex:none}
.sg-status.sg-peak{border-color:var(--dsw-alias-state-error-primary,#dc2626);color:var(--dsw-alias-state-error-primary,#dc2626)}
.sg-status.sg-off{border-color:var(--dsw-alias-state-success-primary,#30a46c);color:var(--dsw-alias-state-success-primary,#30a46c)}
.sg-status.sg-weekend{border-color:var(--dsw-alias-state-success-primary,#30a46c);color:var(--dsw-alias-state-success-primary,#30a46c)}
/* 徽标即按钮（v3.1.4）：所有阶段同一个按钮；v3.1.6 去掉了灰色填充与按钮内箭头 */
.sg-status-root{position:relative;display:inline-flex;flex:none}
.sg-status.sg-status-btn{cursor:pointer}
.sg-status.sg-status-btn:hover{border-color:var(--dsw-alias-border-l4,rgba(0,0,0,.28))}
.sg-status-caret{flex:none;line-height:1;transition:transform .16s}
.sg-status-caret-open{transform:rotate(180deg)}
/* 「高峰拦截列表」面板（.sgMl* 由状态徽标与设置表单共用同一份样式） */
.sgMlBody{margin-top:8px;padding:8px 10px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));border-radius:8px;background:var(--dsw-alias-bg-layer-2,transparent)}
.sgMlBody *{box-sizing:border-box}
.sgMlFilterRow{display:flex;align-items:center;gap:6px;padding-bottom:6px;flex-wrap:wrap}
.sgMlInput{flex:1 1 160px;min-width:0;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:var(--dsw-alias-bg-layer-2,transparent);color:inherit;font:inherit;font-size:12px}
.sgMlInput:disabled{opacity:.6;cursor:not-allowed}
.sgMlError{color:var(--dsw-alias-state-error-primary,#dc2626);font-size:12px;line-height:18px;margin:6px 0 0;word-break:break-word}
.sgMlPatterns{display:flex;align-items:center;flex-wrap:wrap;gap:6px;padding-bottom:6px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08))}
.sgMlSentinel{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:12px}
.sgMlChip{font-size:12px;padding:1px 6px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:4px;font-variant-numeric:tabular-nums}
.sgMlRefresh{margin-left:auto;flex:none;height:22px;padding:0 8px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.sgMlRefresh:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
.sgMlRefresh:disabled{opacity:.55;cursor:default}
.sgMlBtn{flex:none;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.sgMlBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
.sgMlBtn:disabled{opacity:.55;cursor:default}
.sgMlChipUndo{margin-left:4px;padding:0 2px;border:0;background:transparent;color:inherit;font:inherit;font-size:12px;line-height:1;cursor:pointer;opacity:.7}
.sgMlChipUndo:hover:not(:disabled){opacity:1;color:var(--dsw-alias-state-error-primary,#dc2626)}
.sgMlChipUndo:disabled{opacity:.4;cursor:default}
.sgMlHead{display:flex;align-items:baseline;gap:8px;margin:10px 0 4px}
/* 畅跑任务区内嵌在徽标面板最上方（v3.1.6） */
.sg-fr-section{padding-bottom:8px;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08))}
.sg-fr-section .sg-fr-head{margin-bottom:6px}
.sgMlList{list-style:none;margin:0;padding:0;max-height:240px;overflow:auto}
.sgMlProvider{margin:8px 0 2px;font-size:12px;font-weight:600;color:var(--dsw-alias-label-secondary,#6b7280)}
.sgMlItem{display:flex;align-items:center;padding:2px 0}
.sgMlCheck{display:flex;align-items:center;gap:6px;min-width:0;font-size:12px;cursor:pointer}
.sgMlCheck>input{cursor:pointer;flex:none;margin-left:auto}
.sgMlCheck>input:disabled{cursor:not-allowed}
.sgMlCovered{color:var(--dsw-alias-state-error-primary,#dc2626)}
.sgMlDot{flex:none;line-height:1}
.sgMlModel{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sgMlTag{flex:none;font-size:11px;color:var(--dsw-alias-label-tertiary,#6b7280);border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08));border-radius:4px;padding:0 4px}
.sgMlHint{color:var(--dsw-alias-label-tertiary,#6b7280);font-size:12px;line-height:18px;margin:6px 0 0}
.sg-fr-panel,.sg-status-panel{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);z-index:40;width:min(448px,calc(100vw - 24px));max-height:min(70vh,560px);overflow:auto;overscroll-behavior:contain;box-sizing:border-box;padding:10px 12px 12px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));border-radius:10px;background:var(--dsw-specific-input-major,#fff);box-shadow:var(--dsw-elevation-panel,0 6px 24px rgba(0,0,0,.16));color:var(--dsw-alias-label-primary,#111);font-size:12px;line-height:1.5;container-type:inline-size}
.sg-status-panel{width:min(380px,calc(100vw - 24px));z-index:45}
.sg-status-panel *{box-sizing:border-box}
.sg-fr-panel *{box-sizing:border-box}
.sg-fr-head{display:flex;align-items:baseline;gap:8px;font-size:13px;font-weight:600;margin-bottom:8px}
.sg-fr-title{flex:1;min-width:0}
.sg-fr-tz{font-weight:400;font-size:11px;color:var(--dsw-alias-label-tertiary,#6b7280)}
.sg-fr-closeicon{flex:none;width:20px;height:20px;line-height:1;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-tertiary,#6b7280);cursor:pointer;font-size:14px;font-weight:400}
.sg-fr-closeicon:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#111)}
.sg-fr-bar{display:flex;gap:6px;margin-bottom:8px}
.sg-fr-bar-btn{flex:1;min-width:0;height:26px;padding:0 6px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font:inherit;font-size:12px;line-height:1;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sg-fr-bar-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#111)}
.sg-fr-bar-btn:disabled{opacity:.5;cursor:default}
.sg-fr-bar-on{border-color:var(--dsw-alias-button-primary-fill,#4d6bfe);color:var(--dsw-alias-button-primary-fill,#4d6bfe)}
.sg-fr-bar-danger:hover:not(:disabled){border-color:var(--dsw-alias-state-error-primary,#dc2626);color:var(--dsw-alias-state-error-primary,#dc2626)}
.sg-fr-empty{color:var(--dsw-alias-label-tertiary,#6b7280);padding:2px 0 8px}
.sg-fr-list{list-style:none;margin:0 0 8px;padding:0;max-height:168px;overflow:auto}
.sg-fr-item{display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.06))}
.sg-fr-range{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.sg-fr-tag{flex:none;font-size:11px;padding:0 4px;border-radius:4px;border:1px solid transparent}
.sg-fr-tag-active{border-color:var(--dsw-alias-state-success-primary,#30a46c);color:var(--dsw-alias-state-success-primary,#30a46c)}
.sg-fr-tag-scheduled{color:var(--dsw-alias-label-tertiary,#6b7280)}
.sg-fr-tag-paused{border-color:var(--dsw-alias-state-warning-primary,#d97706);color:var(--dsw-alias-state-warning-primary,#d97706)}
.sg-fr-tag-ended{color:var(--dsw-alias-label-dimmed,#9ca3af)}
.sg-fr-icon{flex:none;width:22px;height:22px;line-height:1;padding:0;border:1px solid transparent;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);cursor:pointer;font-size:12px;display:inline-flex;align-items:center;justify-content:center}
.sg-fr-icon:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#111)}
.sg-fr-icon:disabled{opacity:.4;cursor:default}
.sg-fr-icon-danger:hover:not(:disabled){color:var(--dsw-alias-state-error-primary,#dc2626)}
.sg-fr-form{display:flex;flex-direction:column;gap:6px;margin:2px 0 8px;padding:8px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08));border-radius:8px}
.sg-fr-form-actions{display:flex;justify-content:flex-end;gap:6px}
.sg-fr-add,.sg-fr-cancel{height:24px;padding:0 10px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.sg-fr-add{border-color:var(--dsw-alias-button-primary-fill,#4d6bfe);color:var(--dsw-alias-button-primary-fill,#4d6bfe)}
.sg-fr-add:hover:not(:disabled),.sg-fr-cancel:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
.sg-fr-add:disabled,.sg-fr-cancel:disabled{opacity:.55;cursor:default}
.sg-fr-error{color:var(--dsw-alias-state-error-primary,#dc2626);margin-top:6px}
/* ── 日期范围选择器（双月日历，风格对齐 DSH 排期面板）── */
.sg-dr-root{position:relative}
.sg-dr-trigger{display:flex;align-items:center;gap:6px;width:100%;height:28px;padding:0 8px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:var(--dsw-alias-bg-layer-2,transparent);color:inherit;font:inherit;font-size:12px;cursor:pointer;text-align:left}
.sg-dr-trigger:hover:not(:disabled){border-color:var(--dsw-alias-border-l4,rgba(0,0,0,.2))}
.sg-dr-trigger:disabled{opacity:.55;cursor:default}
.sg-dr-text{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-variant-numeric:tabular-nums}
.sg-dr-ph .sg-dr-text{color:var(--dsw-alias-label-tertiary,#6b7280)}
.sg-dr-icon{flex:none;display:inline-flex;color:var(--dsw-alias-label-tertiary,#6b7280)}
.sg-dr-panel{position:absolute;top:calc(100% + 6px);left:0;z-index:60;padding:8px 10px 10px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));border-radius:10px;background:var(--dsw-specific-input-major,#fff);box-shadow:var(--dsw-elevation-panel,0 6px 24px rgba(0,0,0,.16))}
.sg-dr-head{display:flex;align-items:center;gap:2px;margin-bottom:4px}
.sg-dr-spacer{flex:1}
.sg-dr-nav{width:22px;height:22px;padding:0;border:0;border-radius:4px;background:transparent;color:var(--dsw-alias-label-secondary,#6b7280);font-size:12px;line-height:1;cursor:pointer}
.sg-dr-nav:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06));color:var(--dsw-alias-label-primary,#111)}
.sg-dr-months{display:flex;gap:14px}
.sg-dr-month{width:196px}
.sg-dr-mtitle{text-align:center;font-size:12px;font-weight:600;margin-bottom:4px}
.sg-dr-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:1px}
.sg-dr-wd{text-align:center;font-size:11px;color:var(--dsw-alias-label-tertiary,#6b7280);padding-bottom:2px}
.sg-dr-day{height:24px;padding:0;border:0;border-radius:4px;background:transparent;color:inherit;font:inherit;font-size:12px;line-height:1;cursor:pointer;font-variant-numeric:tabular-nums}
.sg-dr-day:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
.sg-dr-out{color:var(--dsw-alias-label-dimmed,#9ca3af)}
.sg-dr-in{background:var(--dsw-alias-interactive-bg-selected,rgba(77,107,254,.12))}
.sg-dr-edge{background:var(--dsw-alias-button-primary-fill,#4d6bfe);color:#fff;font-weight:600}
.sg-dr-edge:hover:not(:disabled){background:var(--dsw-alias-button-primary-hover,#3f5ce8)}
.sg-dr-today{outline:1px solid var(--dsw-alias-border-l4,rgba(0,0,0,.2));outline-offset:-1px}
.sg-fr-hours{display:flex;align-items:center;gap:6px}
.sg-fr-hour{display:flex;align-items:center;gap:4px;flex:1;min-width:0}
.sg-fr-hour>span:first-child{flex:none;color:var(--dsw-alias-label-tertiary,#6b7280)}
.sg-fr-hour>select{flex:1;min-width:0;font:inherit;font-size:12px;padding:3px 6px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:var(--dsw-alias-bg-layer-2,transparent);color:inherit}
.sg-fr-unit{flex:none;color:var(--dsw-alias-label-tertiary,#6b7280)}
.sg-fr-now{flex:none;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.sg-fr-now:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
.sg-fr-form{display:flex;flex-direction:column;gap:6px;margin:8px 0}
.sg-fr-add{align-self:flex-end;height:24px;padding:0 10px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.sg-fr-add:hover:not(:disabled),.sg-fr-resume:hover:not(:disabled),.sg-fr-clear:hover:not(:disabled),.sg-fr-close:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
.sg-fr-add:disabled,.sg-fr-resume:disabled,.sg-fr-clear:disabled{opacity:.55;cursor:default}
.sg-fr-error{color:var(--dsw-alias-state-error-primary,#dc2626);margin-bottom:6px}
.sg-fr-actions{display:flex;justify-content:flex-end;gap:6px;margin-top:4px}
.sg-fr-actions>button{height:24px;padding:0 10px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.sg-fr-resume{border-color:var(--dsw-alias-state-success-primary,#30a46c)!important;color:var(--dsw-alias-state-success-primary,#30a46c)!important}
/* ── 响应式：窄窗口不裁切、日历改弹性列（v3.1.7 起）── */
.sg-dr-months{flex-wrap:wrap;justify-content:center;gap:10px}
.sg-dr-month{width:auto;flex:1 1 168px;min-width:0}
.sg-dr-panel{max-width:calc(100vw - 24px);box-sizing:border-box}
.sg-fr-list,.sgMlList{overflow-x:hidden}
/* ── 窄宽度按钮只留图标（v3.3.0）：容器查询盯面板宽度，回退看视口 ── */
.sg-btn-icon{display:none;line-height:1}
.sg-btn-label{min-width:0;overflow:hidden;text-overflow:ellipsis}
@container (max-width:360px){
  .sg-btn-label{display:none}
  .sg-btn-icon{display:inline}
  .sg-fr-bar-btn,.sgMlBtn{flex:0 0 auto;padding:0 8px}
}
@media (max-width:520px){
  /* 单月：第二个日历换行后依然可读，但优先只显示一个（隐藏第二个） */
  .sg-dr-month+.sg-dr-month{display:none}
  .sg-dr-month{flex:1 1 100%;max-width:280px}
  .sg-fr-bar{flex-wrap:wrap}
  .sg-fr-bar-btn{flex:1 1 30%}
  .sg-fr-hours{flex-wrap:wrap}
  .sg-fr-hour{flex:1 1 100%}
}
/* 视口极窄时回退：改成底部贴合弹层，保证左右不出屏 */
@media (max-width:430px){
  .sg-fr-panel,.sg-status-panel{position:fixed;left:12px;right:12px;transform:none;bottom:60px;width:auto;max-width:none;max-height:64vh}
}
@media (max-width:520px){
  .sg-btn-label{display:none}
  .sg-btn-icon{display:inline}
}
/* ── 徽标 hover 卡片（自绘：原生 title 做不到固定宽度 + 滚动）── */
.sg-tip{position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);z-index:50;display:none;box-sizing:border-box;width:min(340px,calc(100vw - 24px));padding:8px 10px;border:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));border-radius:8px;background:var(--dsw-specific-input-major,#fff);box-shadow:var(--dsw-elevation-panel,0 6px 24px rgba(0,0,0,.16));color:var(--dsw-alias-label-primary,#111);font-size:12px;line-height:1.5;text-align:left;pointer-events:none}
.sg-status-root:hover .sg-tip,.sg-status-root:focus-within .sg-tip{display:block}
.sg-tip *{box-sizing:border-box}
.sg-tip-headline{font-weight:600;margin-bottom:2px}
.sg-tip-line{display:flex;align-items:center;gap:2px;white-space:nowrap}
.sg-tip-hint{margin-top:4px;color:var(--dsw-alias-label-tertiary,#6b7280)}
.sg-tip-bracket{flex:none}
.sg-tip-models{flex:1 1 auto;min-width:0;width:12em;overflow:hidden;white-space:nowrap}
.sg-tip-track{display:inline-flex;gap:10px;white-space:nowrap;animation:sg-tip-marquee 18s linear infinite}
.sg-tip-sep{flex:none;color:var(--dsw-alias-label-tertiary,#6b7280)}
.sg-tip-empty{color:var(--dsw-alias-label-tertiary,#6b7280)}
@keyframes sg-tip-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media (prefers-reduced-motion:reduce){
  .sg-tip-track{animation:none}
  .sg-tip-models{text-overflow:ellipsis;display:block}
}
/* ── 面板底部「当前高峰谷时」（v3.3.0）── */
.sgPp{margin-top:8px;padding-top:8px;border-top:1px solid var(--dsw-alias-border-l2,rgba(0,0,0,.08))}
.sgPp *{box-sizing:border-box}
.sgPpHead{display:flex;align-items:center;gap:8px;margin-bottom:6px}
.sgPpRow{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px}
.sgPpLabel{flex:none;color:var(--dsw-alias-label-tertiary,#6b7280)}
.sgPpInput{flex:1 1 140px;min-width:0;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:var(--dsw-alias-bg-layer-2,transparent);color:inherit;font:inherit;font-size:12px}
.sgPpHint{flex:1 1 100%;color:var(--dsw-alias-label-tertiary,#6b7280);line-height:16px}
.sgPpRows{display:flex;flex-direction:column;gap:4px}
.sgPpTimeRow{flex-wrap:nowrap}
.sgPpTime{flex:1 1 92px;min-width:0;height:24px;padding:0 6px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:var(--dsw-alias-bg-layer-2,transparent);color:inherit;font:inherit;font-size:12px;font-variant-numeric:tabular-nums}
.sgPpDash{flex:none;color:var(--dsw-alias-label-tertiary,#6b7280)}
.sgPpDel{flex:none;width:22px;height:22px;line-height:1;padding:0;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary,#6b7280);cursor:pointer}
.sgPpDel:hover:not(:disabled){color:var(--dsw-alias-state-error-primary,#dc2626)}
.sgPpDel:disabled{opacity:.4;cursor:default}
.sgPpActions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:6px}
.sgPpBtn{flex:none;height:24px;padding:0 8px;border:1px solid var(--dsw-alias-border-l3,rgba(0,0,0,.12));border-radius:6px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}
.sgPpBtn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.06))}
.sgPpBtn:disabled{opacity:.55;cursor:default}
.sgPpSave{margin-left:auto}
.sgPpCheck{display:flex;align-items:center;gap:4px;cursor:pointer}
.sgPpErr{color:var(--dsw-alias-state-error-primary,#dc2626);margin:4px 0 0}
.sgPpOk{color:var(--dsw-alias-state-success-primary,#30a46c);margin:4px 0 0}
`;
		/** 注入一次（幂等；无 document 时静默跳过）。 */
		function injectClientCss() {
			if (typeof document === "undefined") return;
			if (document.querySelector("style[data-plugin-css=\"offpeak-client\"]") !== null) return;
			const tag = document.createElement("style");
			tag.dataset.plugin = "dsh-offpeak";
			tag.dataset.pluginCss = "offpeak-client";
			tag.textContent = CLIENT_CSS;
			document.head.appendChild(tag);
		}
		//#endregion
		//#region src/client/free-run-button.tsx
		/**
		* dsh-offpeak — 畅跑任务区（**内嵌在状态徽标面板最上方**，v3.1.6 起没有独立按钮）。
		*
		* 布局（用户定案，对齐原「畅跑任务管理」弹层）：
		* - **标题行**：`畅跑任务` + `按 <时区>`；
		* - **三个文本按钮**：`新建畅跑任务` / `暂停全部任务`（全暂停时变 `恢复全部任务`）/ `删除全部任务`；
		*   「新建」内联展开起止时间选择器（开始 / 结束，到小时）；
		* - **每行两个图标按钮**：`⏸ / ▶`（暂停 / 恢复该段）与 `×`（删除该段）。
		*
		* 打开/关闭由父层（状态徽标面板）控制：这里没有触发按钮、没有 open 状态、也不点外关闭。
		* 时间选择器的输入值按**配置时区**解释（主机侧解析），标题行标注该时区。
		*
		* 状态更新：5s 轮询 `/session-guard/state`（畅跑是低频交互，轮询足够且最简单）
		* + 本地定时器保证到点后状态及时刷新。全部 fail-open，绝不抛错。
		*/
		/** 兜底轮询间隔（畅跑是低频交互，5s 足够；到点切换另有本地定时器）。 */
		const POLL_MS$1 = 5e3;
		const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
		/**
		* 畅跑任务区（**内嵌在状态徽标面板顶部**，不再有独立按钮）。
		*
		* 布局对齐原「畅跑任务管理」弹层：标题 + 时区 → 新建 / 暂停全部 / 删除全部 → 任务列表。
		* 打开由父层（状态徽标面板）控制，所以这里没有「打开/关闭」状态、没有触发按钮、也不点外关闭。
		*/
		function FreeRunPanel({ sessionId, displayTz }) {
			const [view, setView] = (0, react.useState)(EMPTY_FREE_RUN);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)("");
			const [creating, setCreating] = (0, react.useState)(false);
			const [fromDate, setFromDate] = (0, react.useState)("");
			const [fromHour, setFromHour] = (0, react.useState)("");
			const [toDate, setToDate] = (0, react.useState)("");
			const [toHour, setToHour] = (0, react.useState)("");
			/** 用「当前时刻」重新播种起止（开始 = 本小时整点，结束 = +2h）。 */
			const seedFromNow = (0, react.useCallback)(() => {
				const s = seedRange(/* @__PURE__ */ new Date());
				setFromDate(s.fromDate);
				setFromHour(s.fromHour);
				setToDate(s.toDate);
				setToHour(s.toHour);
			}, []);
			injectClientCss();
			const poll = (0, react.useCallback)(async () => {
				if (sessionId === void 0 || sessionId === "") return;
				try {
					const body = await (await fetch(`/session-guard/state?session=${encodeURIComponent(sessionId)}`)).json().catch(() => null);
					setView(readFreeRun(body));
				} catch {}
			}, [sessionId]);
			(0, react.useEffect)(() => {
				if (sessionId === void 0 || sessionId === "") return;
				let cancelled = false;
				poll();
				const timer = setInterval(() => {
					if (!cancelled) poll();
				}, POLL_MS$1);
				return () => {
					cancelled = true;
					clearInterval(timer);
				};
			}, [sessionId, poll]);
			(0, react.useEffect)(() => {
				const ms = view.msRemaining;
				if (ms === null || !Number.isFinite(ms) || ms <= 0) return;
				const timer = setTimeout(() => {
					poll();
				}, ms + 500);
				return () => {
					clearTimeout(timer);
				};
			}, [view.msRemaining, poll]);
			(0, react.useEffect)(() => {
				seedFromNow();
			}, [seedFromNow]);
			const rpc = (0, react.useCallback)(async (action, payload = {}) => {
				if (sessionId === void 0 || sessionId === "") return false;
				setBusy(true);
				setError("");
				try {
					const body = await (await fetch("/session-guard/rpc", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							sessionId,
							action,
							...payload
						})
					})).json().catch(() => null);
					if (body?.ok === true) {
						setView(readFreeRun({
							ok: true,
							freeRun: body.result
						}));
						return true;
					}
					setError(typeof body?.error === "string" ? body.error : "操作失败");
					return false;
				} catch {
					setError("操作失败（网络或路由不可用）");
					return false;
				} finally {
					setBusy(false);
				}
			}, [sessionId]);
			if (sessionId === void 0 || sessionId === "") return null;
			if (!view.available && view.windows.length === 0) return null;
			const onAdd = async () => {
				if (fromDate === "" || fromHour === "" || toDate === "" || toHour === "") {
					setError("请选择开始与结束时间");
					return;
				}
				if (await rpc("freeRunAdd", {
					from: combineStart(fromDate, fromHour),
					to: combineEnd(toDate, toHour)
				})) {
					setError("");
					setCreating(false);
				}
			};
			const nothingToAct = toolbarDisabled(view);
			const allPaused = allTasksPaused(view);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sg-fr-section",
				role: "group",
				"aria-label": "畅跑任务",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sg-fr-head",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "sg-fr-title",
							children: "畅跑任务"
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "sg-fr-tz",
							children: ["按 ", view.timezone === "" ? "本地时区" : view.timezone]
						})]
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sg-fr-bar",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: `sg-fr-bar-btn ${creating ? "sg-fr-bar-on" : ""}`,
								disabled: busy,
								"aria-pressed": creating,
								title: "新建畅跑任务",
								onClick: () => {
									setCreating((prev) => !prev);
									setError("");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-btn-icon",
									"aria-hidden": "true",
									children: ICON_ADD
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-btn-label",
									children: "新建畅跑任务"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "sg-fr-bar-btn",
								disabled: busy || nothingToAct,
								title: pauseAllLabel(view),
								onClick: () => {
									rpc(allPaused ? "freeRunResumeAll" : "freeRunPauseAll");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-btn-icon",
									"aria-hidden": "true",
									children: allPaused ? ICON_RESUME : ICON_PAUSE
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-btn-label",
									children: pauseAllLabel(view)
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "sg-fr-bar-btn sg-fr-bar-danger",
								disabled: busy || view.windows.length === 0,
								title: "删除全部任务",
								onClick: () => {
									rpc("freeRunClear");
								},
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-btn-icon",
									"aria-hidden": "true",
									children: "×"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-btn-label",
									children: "删除全部任务"
								})]
							})
						]
					}),
					creating && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sg-fr-form",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(DateRangePicker, {
								from: fromDate,
								to: toDate,
								disabled: busy,
								onChange: (f, t) => {
									setFromDate(f);
									setToDate(t);
									setError("");
								}
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "sg-fr-hours",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "sg-fr-hour",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "开始" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
												value: fromHour,
												disabled: busy,
												onChange: (e) => {
													setFromHour(e.target.value);
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "",
													children: "时"
												}), HOURS.map((h) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: h,
													children: h
												}, h))]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "sg-fr-unit",
												children: "时"
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "sg-fr-hour",
										children: [
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", { children: "结束" }),
											/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
												value: toHour,
												disabled: busy,
												onChange: (e) => {
													setToHour(e.target.value);
												},
												children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: "",
													children: "时"
												}), HOURS.map((h) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
													value: h,
													children: h
												}, h))]
											}),
											/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: "sg-fr-unit",
												children: "时"
											})
										]
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "sg-fr-now",
										disabled: busy,
										title: "重置为当前时刻",
										onClick: seedFromNow,
										children: "现在"
									})
								]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "sg-fr-form-actions",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "sg-fr-add",
									disabled: busy,
									onClick: () => void onAdd(),
									children: "确定"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "sg-fr-cancel",
									disabled: busy,
									onClick: () => {
										setCreating(false);
										setError("");
									},
									children: "取消"
								})]
							})
						]
					}),
					view.windows.length === 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sg-fr-empty",
						children: "还没有畅跑任务，点「新建畅跑任务」添加"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "sg-fr-list",
						children: view.windows.map((w) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
							className: "sg-fr-item",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-fr-range",
									children: formatInstantRange(w.from, w.to, displayTz === void 0 || displayTz === "" ? view.timezone : displayTz) || `${w.fromDisplay} – ${w.toDisplay}`
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: `sg-fr-tag sg-fr-tag-${w.status}`,
									children: statusLabel(w.status)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "sg-fr-icon",
									title: rowPauseTitle(w),
									"aria-label": w.paused === true ? "恢复" : "暂停",
									disabled: busy || !canPause(w) && !canResume(w),
									onClick: () => {
										rpc(w.paused === true ? "freeRunResume" : "freeRunPause", { id: w.id });
									},
									children: w.paused === true ? ICON_RESUME : ICON_PAUSE
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "sg-fr-icon sg-fr-icon-danger",
									title: rowDeleteTitle(),
									"aria-label": "删除",
									disabled: busy,
									onClick: () => {
										rpc("freeRunRemove", { id: w.id });
									},
									children: "×"
								})
							]
						}, w.id))
					}),
					error !== "" && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sg-fr-error",
						children: error
					})
				]
			});
		}
		//#endregion
		//#region src/client/model-list.ts
		/** 单个列表项是否命中模型名：**精确匹配**（大小写不敏感、去首尾空白）。 */
		function matchesPattern(model, pattern) {
			if (typeof model !== "string" || typeof pattern !== "string") return false;
			const a = model.trim().toLowerCase();
			const b = pattern.trim().toLowerCase();
			return a !== "" && b !== "" && a === b;
		}
		/** 算出某模型名在给定列表下的行状态。 */
		function rowState(model, patterns) {
			const matched = (Array.isArray(patterns) ? patterns : []).filter((p) => matchesPattern(model, p));
			return {
				matched,
				explicit: matched.length > 0,
				covered: matched.length > 0
			};
		}
		/**
		* 勾选/取消勾选**单个**模型 → 新列表。
		*
		* - 已存在**完全同名**条目 → 删掉它（取消勾选）；
		* - 否则 → 把模型名作为一个新条目追加。
		*
		* 纯函数：不修改入参，返回新数组（去重、保持原有顺序）。
		*/
		function toggleModel(patterns, model) {
			const list = Array.isArray(patterns) ? [...patterns] : [];
			if (typeof model !== "string" || model === "") return list;
			const at = list.indexOf(model);
			if (at !== -1) {
				list.splice(at, 1);
				return list;
			}
			if (!list.includes(model)) list.push(model);
			return list;
		}
		/**
		* 关键词过滤：大小写不敏感的**子串**匹配，命中范围是 `provider/model`（只按 model 也能命中）。
		*
		* 只作用于**展示**与「全选」范围 —— 模型集合、拦截列表本身都不变（空关键词 = 不过滤）。
		*/
		function filterRows(rows, keyword) {
			const list = Array.isArray(rows) ? rows : [];
			const q = typeof keyword === "string" ? keyword.trim().toLowerCase() : "";
			if (q === "") return [...list];
			return list.filter((r) => `${r.provider}/${r.model}`.toLowerCase().includes(q));
		}
		/** 当前过滤结果是否已**全部**被拦截（决定「全选」按钮的文案与动作）。 */
		function allCovered(patterns, rows) {
			const list = Array.isArray(rows) ? rows : [];
			if (list.length === 0) return false;
			return list.every((r) => rowState(r.model, patterns).covered);
		}
		/**
		* 批量勾选：对**传入的这些行**（= 当前过滤结果）执行全选 / 取消全选。
		*
		* - `checked = true`：把还没被覆盖的模型名作为显式条目补进列表（已有条目不动）；
		* - `checked = false`：把与这些模型名**完全同名**的条目删掉（与单行勾选的语义一致）。
		*
		* 纯函数：不修改入参，返回新数组。
		*/
		function bulkToggle(patterns, rows, checked) {
			const before = Array.isArray(patterns) ? patterns : [];
			const list = [...before];
			const models = (Array.isArray(rows) ? rows : []).map((r) => r.model);
			if (checked) {
				for (const m of models) {
					if (typeof m !== "string" || m === "") continue;
					if (rowState(m, before).covered) continue;
					if (!list.includes(m)) list.push(m);
				}
				return list;
			}
			const drop = new Set(models);
			return list.filter((p) => !drop.has(p));
		}
		//#endregion
		//#region src/client/model-panel.tsx
		/**
		* dsh-offpeak — 「高峰拦截列表」面板（状态徽标展开区）。
		*
		* 形态（v3.1.6）：
		*   - 列表 = DSH 当前全部模型（`GET /session-guard/models`：各路由自报 + 本插件观察到的真实目标），
		*     每行一个模型、**复选框在行右侧**、按 provider 分组；
		*   - 顶部**关键词过滤框** + **全选 / 取消全选**（只作用于当前过滤结果）+ **刷新**（重拉模型列表）
		*     + **热重载**（先让 host 重读配置文件，再拉一次）；
		*   - **已拦截**：勾选即该模型名进列表（`POST /session-guard/rpc {action:'setModelPatterns'}` →
		*     写 `config/offpeak.json` 并立即 reload；0.1.7 客户端没有 settingsScope，这是本线唯一
		*     写入口）。列表项**精确匹配模型名**（大小写不敏感），没有关键字/正则的批量覆盖，
		*     因此每一项都能用它的 `×` **撤销**。
		*
		* 行状态与过滤/批量逻辑都在 `model-list.ts`（纯函数、可单测）；host 侧判定逻辑不变。
		*/
		function ModelListPanel() {
			const [loading, setLoading] = (0, react.useState)(true);
			const [models, setModels] = (0, react.useState)([]);
			const [patterns, setPatterns] = (0, react.useState)([]);
			const [error, setError] = (0, react.useState)(null);
			const [writeError, setWriteError] = (0, react.useState)(null);
			const [keyword, setKeyword] = (0, react.useState)("");
			const [pending, setPending] = (0, react.useState)(false);
			const load = async () => {
				setLoading(true);
				setError(null);
				const [modelsRes, settingsRes] = await Promise.allSettled([fetch("/session-guard/models").then((r) => r.json()), fetch("/session-guard/settings").then((r) => r.json())]);
				const modelsBody = modelsRes.status === "fulfilled" ? modelsRes.value : null;
				if (modelsBody?.ok && Array.isArray(modelsBody.models)) setModels(modelsBody.models);
				else setError("模型列表不可用（host 需为 v3.1.5+：重启 DSH 后 /session-guard/models 才存在）");
				const list = (settingsRes.status === "fulfilled" ? settingsRes.value : null)?.settings?.officialModelPatterns;
				if (Array.isArray(list)) setPatterns(list);
				setLoading(false);
			};
			/** 热重载：让 host 重读配置文件，然后重拉列表与模型目录。 */
			const hotReload = async () => {
				try {
					await fetch("/session-guard/rpc", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ action: "reloadConfig" })
					});
				} catch {}
				await load();
			};
			(0, react.useEffect)(() => {
				load();
			}, []);
			/** 写回拦截列表（本线：写配置文件 + reload；失败只提示，不改本地展示）。 */
			const commit = async (next) => {
				setPending(true);
				setWriteError(null);
				const before = patterns;
				setPatterns(next);
				try {
					const res = await fetch("/session-guard/rpc", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							action: "setModelPatterns",
							patterns: next
						})
					});
					const body = await res.json().catch(() => null);
					if (!res.ok || body?.ok !== true) {
						setPatterns(before);
						setWriteError(String(body?.error ?? `写入失败（HTTP ${res.status}）`));
					} else if (Array.isArray(body.result?.patterns)) setPatterns(body.result.patterns);
				} catch (e) {
					setPatterns(before);
					setWriteError(`写入失败：${e instanceof Error ? e.message : String(e)}`);
				} finally {
					setPending(false);
				}
			};
			const filtered = filterRows(models, keyword);
			const providers = [...new Set(filtered.map((r) => r.provider))].sort();
			const everyCovered = allCovered(patterns, filtered);
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sgMlBody",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sgMlFilterRow",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
								className: "sgMlInput",
								type: "text",
								value: keyword,
								placeholder: "过滤模型（provider/model 子串）",
								onChange: (e) => setKeyword(e.currentTarget.value)
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "sgMlBtn",
								disabled: pending || filtered.length === 0,
								onClick: () => void commit(bulkToggle(patterns, filtered, !everyCovered)),
								title: "只作用于当前过滤结果",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-btn-icon",
									"aria-hidden": "true",
									children: ICON_CHECK
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-btn-label",
									children: everyCovered ? "取消全选" : "全选"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "sgMlBtn",
								disabled: loading,
								onClick: () => void load(),
								title: "重新获取模型列表",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-btn-icon",
									"aria-hidden": "true",
									children: ICON_REFRESH
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-btn-label",
									children: loading ? "获取中…" : "刷新"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: "sgMlBtn",
								disabled: loading,
								onClick: () => void hotReload(),
								title: "重读配置文件后再拉一次",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-btn-icon",
									"aria-hidden": "true",
									children: ICON_RELOAD
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-btn-label",
									children: "热重载"
								})]
							})
						]
					}),
					patterns.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sgMlPatterns",
						children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "sgMlSentinel",
							children: "已拦截"
						}), patterns.map((p) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: "sgMlChip",
							children: [p, /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: "sgMlChipUndo",
								disabled: pending,
								title: "撤销这一项",
								"aria-label": `撤销 ${p}`,
								onClick: () => void commit(patterns.filter((x) => x !== p)),
								children: "×"
							})]
						}, p))]
					}),
					writeError !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
						className: "sgMlError",
						children: ["✗ ", writeError]
					}),
					error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "sgMlHint",
						children: error
					}),
					error === null && !loading && filtered.length === 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "sgMlHint",
						children: models.length === 0 ? "没有可枚举的模型。" : "没有匹配的模型。"
					}),
					filtered.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
						className: "sgMlList",
						children: providers.map((provider) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "sgMlProvider",
							children: provider
						}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
							className: "sgMlList",
							children: filtered.filter((r) => r.provider === provider).map((r) => {
								const state = rowState(r.model, patterns);
								return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("li", {
									className: "sgMlItem",
									children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: "sgMlCheck",
										title: "勾选 = 加入高峰拦截列表",
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: "sgMlModel",
											children: r.model
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											type: "checkbox",
											checked: state.covered,
											disabled: pending,
											onChange: () => void commit(toggleModel(patterns, r.model))
										})]
									})
								}, `${provider}/${r.model}`);
							})
						})] }, provider))
					})
				]
			});
		}
		/** 新增行的默认时间。 */
		const NEW_ROW = {
			start: "09:00",
			end: "18:00"
		};
		/** 从 `/settings` 的生效配置里取默认行（形状异常 → 空数组，交给调用方兜底）。 */
		function rowsFromSettings(settings) {
			const s = settings ?? {};
			const list = Array.isArray(s.peakWindows) ? s.peakWindows : [];
			const rows = [];
			for (const w of list) {
				if (w === null || typeof w !== "object") continue;
				const raw = w;
				rows.push({
					start: typeof raw.start === "string" ? raw.start : "",
					end: typeof raw.end === "string" ? raw.end : ""
				});
			}
			return rows;
		}
		/** 从 `/settings` 取「周末默认谷时」开关。 */
		function weekendModeFromSettings(settings) {
			return (settings ?? {}).weekendMode === true;
		}
		/** 单行校验：返回错误文案，或 null 表示合法。 */
		function rowError(row) {
			const re = /^([01]\d|2[0-3]):[0-5]\d$/;
			if (!re.test(row.start) || !re.test(row.end)) return "时间格式应为 HH:MM";
			if (row.start === row.end) return "起止时间不能相同";
			return null;
		}
		/** 整表校验：返回错误文案，或 null 表示可以提交。 */
		function validateRows(rows) {
			if (rows.length === 0) return "至少保留一个高峰时段";
			if (rows.length > 8) return `最多 8 个高峰时段`;
			for (let i = 0; i < rows.length; i++) {
				const err = rowError(rows[i]);
				if (err !== null) return `第 ${i + 1} 段：${err}`;
			}
			return null;
		}
		/** 两行表是否完全相同（判断「有没有改动」，决定保存按钮是否可用）。 */
		function rowsEqual(a, b) {
			if (a.length !== b.length) return false;
			for (let i = 0; i < a.length; i++) if (a[i].start !== b[i].start || a[i].end !== b[i].end) return false;
			return true;
		}
		/** 改一行（越界返回原数组，保持不可变）。 */
		function updateRow(rows, index, patch) {
			if (index < 0 || index >= rows.length) return rows;
			return rows.map((row, i) => i === index ? {
				...row,
				...patch
			} : row);
		}
		/** 追加一行（已到上限则原样返回）。 */
		function addRow(rows) {
			if (rows.length >= 8) return rows;
			return [...rows, { ...NEW_ROW }];
		}
		/** 删一行（只剩一行时原样返回：不允许清空）。 */
		function removeRow(rows, index) {
			if (rows.length <= 1 || index < 0 || index >= rows.length) return rows;
			return rows.filter((_, i) => i !== index);
		}
		/** RPC 请求体。 */
		function payloadOf(rows, weekendMode) {
			return {
				windows: rows.map((r) => ({
					start: r.start,
					end: r.end
				})),
				weekendMode
			};
		}
		//#endregion
		//#region src/client/peak-policy-panel.tsx
		/**
		* dsh-offpeak — 面板底部「当前高峰谷时」区（v3.3.0）。
		*
		* 默认值取 `GET /session-guard/settings` 的**生效配置**（用户自己的时段），
		* 保存经 `POST /session-guard/rpc {action:'setPeakPolicy'}` 写回配置文件并立即 reload。
		*
		* 时区选择项放在本区，但它**只影响展示**（配置文件里的时间值不动）：显示时区由父组件持有，
		* 畅跑列表与 hover 卡片共用同一个；本区的时间行始终按**策略时区**填写。
		*/
		function PeakPolicyPanel({ displayTz, onDisplayTzChange }) {
			const [policyTz, setPolicyTz] = (0, react.useState)("");
			const [rows, setRows] = (0, react.useState)([]);
			const [savedRows, setSavedRows] = (0, react.useState)([]);
			const [weekendMode, setWeekendMode] = (0, react.useState)(false);
			const [savedWeekend, setSavedWeekend] = (0, react.useState)(false);
			const [loading, setLoading] = (0, react.useState)(true);
			const [busy, setBusy] = (0, react.useState)(false);
			const [error, setError] = (0, react.useState)(null);
			const [notice, setNotice] = (0, react.useState)(null);
			const [tzDraft, setTzDraft] = (0, react.useState)(displayTz);
			(0, react.useEffect)(() => {
				setTzDraft(displayTz);
			}, [displayTz]);
			(0, react.useEffect)(() => {
				let cancelled = false;
				const load = async () => {
					try {
						const body = await (await fetch("/session-guard/settings")).json().catch(() => null);
						if (cancelled || body?.ok !== true) return;
						const nextRows = rowsFromSettings(body.settings);
						setPolicyTz(typeof body.settings?.timezone === "string" ? body.settings.timezone : "");
						setRows(nextRows);
						setSavedRows(nextRows);
						const weekend = weekendModeFromSettings(body.settings);
						setWeekendMode(weekend);
						setSavedWeekend(weekend);
					} catch {} finally {
						if (!cancelled) setLoading(false);
					}
				};
				load();
				return () => {
					cancelled = true;
				};
			}, []);
			const dirty = !rowsEqual(rows, savedRows) || weekendMode !== savedWeekend;
			const invalid = validateRows(rows);
			const tzValue = tzDraft !== "" ? tzDraft : policyTz !== "" ? policyTz : "Asia/Shanghai";
			const timezoneOptions = [.../* @__PURE__ */ new Set([tzValue, ...IANA_TIMEZONES])];
			const applyDisplayTz = (value) => {
				const next = value.trim();
				setTzDraft(next);
				if (normalizeDisplayTz(next, displayTz) !== next) return;
				onDisplayTzChange(next);
				writeDisplayTz(next);
			};
			const commit = async () => {
				const problem = validateRows(rows);
				if (problem !== null) {
					setError(problem);
					return;
				}
				setBusy(true);
				setError(null);
				setNotice(null);
				try {
					const body = await (await fetch("/session-guard/rpc", {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							action: "setPeakPolicy",
							...payloadOf(rows, weekendMode)
						})
					})).json().catch(() => null);
					if (body?.ok !== true) {
						setError(typeof body?.error === "string" ? body.error : "保存失败");
						return;
					}
					const result = body.result ?? {};
					const nextRows = rowsFromSettings({ peakWindows: result.windows });
					setRows(nextRows);
					setSavedRows(nextRows);
					setWeekendMode(result.weekendMode === true);
					setSavedWeekend(result.weekendMode === true);
					setNotice("已写入配置文件并生效");
				} catch {
					setError("保存失败：网络或宿主不可达");
				} finally {
					setBusy(false);
				}
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sgPp",
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
						className: "sgPpHead",
						children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: "sg-fr-title",
							children: "当前高峰谷时"
						})
					}),
					/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sgPpRow sgPpTz",
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
								className: "sgPpLabel",
								htmlFor: "sgPpTz",
								children: "显示时区"
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("select", {
								id: "sgPpTz",
								className: "sgPpInput",
								value: tzValue,
								onChange: (e) => applyDisplayTz(e.target.value),
								children: timezoneOptions.map((tz) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
									value: tz,
									children: tz
								}, tz))
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: "sgPpHint",
								children: `只影响展示：畅跑与峰谷时间会按它换算，配置文件仍按 ${policyTz === "" ? "策略时区" : policyTz} 存储`
							})
						]
					}),
					loading ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
						className: "sgMlHint",
						children: "读取配置中…"
					}) : /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
							className: "sgPpRows",
							children: rows.map((row, i) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "sgPpRow sgPpTimeRow",
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: "sgPpTime",
										type: "time",
										step: 60,
										value: row.start,
										onChange: (e) => setRows((prev) => updateRow(prev, i, { start: e.target.value }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "sgPpDash",
										children: "–"
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										className: "sgPpTime",
										type: "time",
										step: 60,
										value: row.end,
										onChange: (e) => setRows((prev) => updateRow(prev, i, { end: e.target.value }))
									}),
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: "sgPpDel",
										disabled: busy || rows.length <= 1,
										title: "删除这一段（至少保留一段）",
										"aria-label": "删除这一段",
										onClick: () => setRows((prev) => removeRow(prev, i)),
										children: "×"
									}),
									rowError(row) !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: "sgPpErr",
										children: rowError(row)
									})
								]
							}, `${i}-${row.start}-${row.end}`))
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: "sgPpActions",
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "sgPpBtn",
									disabled: busy || rows.length >= 8,
									title: "添加一个高峰时段（最多 8 段）",
									onClick: () => setRows((prev) => addRow(prev)),
									children: "＋ 添加时段"
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
									className: "sgPpCheck",
									title: "勾选后周末整日按谷时处理；不勾选则周末也按上面的时段判定",
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
										type: "checkbox",
										checked: weekendMode,
										disabled: busy,
										onChange: (e) => setWeekendMode(e.target.checked)
									}), "周末默认谷时"]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "sgPpBtn sgPpSave",
									disabled: busy || !dirty || invalid !== null,
									onClick: () => void commit(),
									children: busy ? "保存中…" : "保存"
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
							className: "sgPpHint",
							children: [
								"时间按策略时区 ",
								policyTz === "" ? "（同显示时区）" : policyTz,
								" 填写；星期限制仍在配置文件里编辑。"
							]
						}),
						invalid !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "sgPpErr",
							children: invalid
						}),
						error !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "sgPpErr",
							children: error
						}),
						notice !== null && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: "sgPpOk",
							children: notice
						})
					] })
				]
			});
		}
		/**
		* 计算面板几何：优先向上（徽标在输入区，平时都在底部），上方不够就向下；
		* 水平居中于触发按钮并夹在视口内。
		*/
		function computePanelPlacement({ anchor, viewport, preferredWidth, gap = 8, margin = 12, minHeight = 260 }) {
			const width = Math.max(0, Math.min(preferredWidth, viewport.width - margin * 2));
			const centered = anchor.left + anchor.width / 2 - width / 2;
			const maxLeft = Math.max(margin, viewport.width - width - margin);
			const left = Math.min(Math.max(centered, margin), maxLeft);
			const spaceAbove = anchor.top - margin - gap;
			const spaceBelow = viewport.height - anchor.bottom - margin - gap;
			const side = spaceAbove >= minHeight || spaceAbove >= spaceBelow ? "up" : "down";
			const maxHeight = Math.max(80, Math.floor(side === "up" ? spaceAbove : spaceBelow));
			if (side === "up") return {
				position: "fixed",
				side,
				left,
				width,
				bottom: Math.max(0, viewport.height - anchor.top + gap),
				maxHeight
			};
			return {
				position: "fixed",
				side,
				left,
				width,
				top: Math.max(0, anchor.bottom + gap),
				maxHeight
			};
		}
		//#endregion
		//#region src/client/status-badge.tsx
		/**
		* dsh-offpeak — 状态徽标（**徽标即按钮**，fail-open）。
		*
		* 轮询 host 的 `/session-guard/status`（阶段 + 配置事实）与 `/session-guard/state`
		* （本会话畅跑任务），显示四态文案：
		*   - 高峰 + 有畅跑任务 → `高峰 · 畅跑中`；
		*   - 高峰 + 有拦截任务 → `高峰 · 拦截中`；
		*   - 高峰 + 都没任务 → `高峰`；
		*   - 非高峰 → `谷时` / `周末`。
		*
		* hover 提示是**自绘卡片**（`BadgeTipCard`：原生 tooltip 无法做「【】固定宽度 + 滚动」），
		* 文案由用户配置生成；无障碍文本走按钮的 `aria-label`。
		*
		* 点开面板 = 畅跑任务区（最上方）+ 高峰拦截列表 + 当前高峰谷时（最底部）。
		* 显示时区只影响展示（畅跑列表、峰谷时间、hover 卡片共用），配置文件里的时间值不动。
		*/
		const POLL_MS = 15e3;
		/** 卡片时间文本：当前窗口 / 全部时段摘要 / 下一段高峰（都按显示时区换算）。 */
		function tipTimesOf(status, displayTz) {
			const policyTz = status.timezone;
			const windows = Array.isArray(status.peakWindows) ? status.peakWindows : [];
			const current = windows.find((w) => w.name !== void 0 && w.name === status.windowName) ?? (status.phase === "peak" ? windows[0] : void 0);
			const nextPeakAt = typeof status.nextPeakAt === "string" && status.nextPeakAt !== "" ? status.nextPeakAt : "";
			return {
				currentWindow: current === void 0 ? null : formatWindow(current.start, current.end, policyTz, displayTz),
				peakSummary: curateSummary(formatWindows(windows, policyTz, displayTz)),
				nextPeak: nextPeakAt === "" ? null : formatInstant(nextPeakAt, displayTz)
			};
		}
		function curateSummary(text) {
			return text === "" ? null : text;
		}
		/** 状态徽标：轮询全局阶段，显示 高峰/谷时/周末（enabled 关闭或请求失败时静默隐藏）。 */
		function StatusBadge({ sessionId }) {
			const [status, setStatus] = (0, react.useState)(null);
			const [freeRun, setFreeRun] = (0, react.useState)(EMPTY_FREE_RUN);
			const [open, setOpen] = (0, react.useState)(false);
			const [displayTz, setDisplayTz] = (0, react.useState)(() => readDisplayTz());
			const rootRef = (0, react.useRef)(null);
			const buttonRef = (0, react.useRef)(null);
			const [placement, setPlacement] = (0, react.useState)(null);
			injectClientCss();
			(0, react.useEffect)(() => {
				if (!sessionId) return;
				let cancelled = false;
				const poll = async () => {
					try {
						const body = await (await fetch("/session-guard/status")).json().catch(() => null);
						if (!cancelled && body?.ok && body.status) setStatus(body.status);
					} catch {}
					try {
						const body = await (await fetch(`/session-guard/state?session=${encodeURIComponent(sessionId)}`)).json().catch(() => null);
						if (!cancelled && body !== null) setFreeRun(readFreeRun(body));
					} catch {}
				};
				poll();
				const timer = setInterval(poll, POLL_MS);
				return () => {
					cancelled = true;
					clearInterval(timer);
				};
			}, [sessionId]);
			(0, react.useEffect)(() => {
				if (!open) return;
				const onPointerDown = (ev) => {
					const root = rootRef.current;
					const target = ev.target;
					if (root === null || !(target instanceof Node)) return;
					if (!root.contains(target)) setOpen(false);
				};
				document.addEventListener("mousedown", onPointerDown);
				return () => document.removeEventListener("mousedown", onPointerDown);
			}, [open]);
			(0, react.useEffect)(() => {
				if (!open) {
					setPlacement(null);
					return;
				}
				const measure = () => {
					const el = buttonRef.current;
					if (el === null) return;
					const r = el.getBoundingClientRect();
					setPlacement(computePanelPlacement({
						anchor: {
							top: r.top,
							bottom: r.bottom,
							left: r.left,
							width: r.width
						},
						viewport: {
							width: window.innerWidth,
							height: window.innerHeight
						},
						preferredWidth: 380
					}));
				};
				measure();
				window.addEventListener("resize", measure);
				window.addEventListener("scroll", measure, true);
				return () => {
					window.removeEventListener("resize", measure);
					window.removeEventListener("scroll", measure, true);
				};
			}, [open]);
			if (!status || !status.enabled) return null;
			const tasks = {
				intercepting: (status.modelPatterns ?? 0) > 0,
				freeRun: freeRun.windows.length > 0
			};
			const effectiveTz = displayTz !== "" ? displayTz : status.timezone;
			const tip = badgeTip(status, tipTimesOf(status, effectiveTz));
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: "sg-status-root",
				ref: rootRef,
				children: [
					/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						ref: buttonRef,
						className: badgeClassNames(status),
						"aria-label": tipText(tip),
						"aria-expanded": open,
						"data-sg-phase": status.phase,
						"data-sg-provider-guard": status.providerGuard === true ? "on" : "off",
						onClick: () => setOpen(!open),
						children: peakLabel(status, tasks)
					}),
					!open && /* @__PURE__ */ (0, react_jsx_runtime.jsx)(BadgeTipCard, { tip }),
					open && /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: "sg-status-panel",
						role: "dialog",
						"aria-label": "高峰面板",
						style: placement === null ? void 0 : {
							position: placement.position,
							left: placement.left,
							width: placement.width,
							top: placement.top ?? "auto",
							bottom: placement.bottom ?? "auto",
							maxHeight: placement.maxHeight,
							transform: "none"
						},
						children: [
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(FreeRunPanel, {
								sessionId,
								displayTz: effectiveTz
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: "sgMlHead",
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: "sg-fr-title",
									children: "高峰拦截列表（按模型名）"
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: "sg-fr-closeicon",
									onClick: () => setOpen(false),
									"aria-label": "关闭",
									title: "关闭面板",
									children: "×"
								})]
							}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(ModelListPanel, {}),
							/* @__PURE__ */ (0, react_jsx_runtime.jsx)(PeakPolicyPanel, {
								displayTz: effectiveTz,
								onDisplayTzChange: setDisplayTz
							})
						]
					})
				]
			});
		}
		//#endregion
		//#region src/client/index.ts
		/**
		* dsh-offpeak — 浏览器 half。
		*
		* 职责（全部 fail-open，D8）：
		* - 在 composer 输入区右侧注册「畅跑」按钮与**纯展示**状态徽标（高峰/谷时/周末）；
		* - **不做**冻结/会话动作——冻结按钮由 input-traffic 接管并经 /session-guard/rpc
		*   桥接 host 会话门；本插件客户端不注册任何按钮，避免与 input-traffic 冲突。
		*
		* 兼容性注记（0.1.7 line）：**客户端**服务 `settingsScope` 在 dsh 0.1.7 起不再提供
		* （它原本只为设置卡片席位服务）。若把它写进静态 `inject`，客户端条目会永远 pending
		* （waiting for service: settingsScope）并让应用 **web boot 致命失败** —— 这是实测到的
		* 崩溃原因，与宿主 `settings` 服务无关（宿主那个服务仍在，只是已无 `register`/`get`）。
		* 上游 compat/0.1.7 线因此整体去掉了设置卡片（`inject = ['slots','locale']`）；这里跟随
		* 同一条口径：设置表单由宿主 `Config` 的 `.volatile()` 字段自动生成，客户端不再承载设置面板。
		*
		* 构建：tsdown → lib/client.js（__ModuleLoader__.load 注册，与 input-traffic 同构）。
		*/
		/** 客户端所需服务：slots（状态徽标）+ locale。 */
		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.slots.inject("conversation.input.right", () => ctx.slots.register({
				name: "conversation.input.right",
				id: "offpeak-status",
				order: 40,
				locale: "offpeak"
			}, StatusBadge));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map