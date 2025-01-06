function updateTime() {
    const now = new Date();
    
    // 更新日期和时间显示
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    document.getElementById('date').textContent = now.toLocaleDateString('zh-CN', dateOptions);
    document.getElementById('time').textContent = now.toLocaleTimeString('zh-CN');

    // 更新周末倒计时
    const daysToWeekend = 5 - now.getDay(); // 假设周末是周六周日
    const weekendText = daysToWeekend > 0 ? 
        `${daysToWeekend}天` : 
        (now.getDay() === 6 || now.getDay() === 0 ? "已经是周末啦！" : "今天就是周五！");
    document.getElementById('weekend-time').textContent = weekendText;

    // 获取设置并计算工作进度
    chrome.storage.sync.get({
        salary: 10000,
        workDays: 22,
        startTime: '09:00',
        endTime: '18:00',
        hasLunch: false,
        lunchStart: '12:00',
        lunchEnd: '13:00'
    }, (settings) => {
        // 调试信息
        console.log('Settings loaded:', settings);

        const [startHour, startMin] = settings.startTime.split(':').map(Number);
        const [endHour, endMin] = settings.endTime.split(':').map(Number);
        
        const workStart = new Date(now);
        workStart.setHours(startHour, startMin, 0);
        
        const workEnd = new Date(now);
        workEnd.setHours(endHour, endMin, 0);

        // 计算距离下班时间
        let timeUntilOff = '';
        if (now < workStart) {
            timeUntilOff = "还没到上班时间";
        } else if (now > workEnd) {
            timeUntilOff = "已经下班啦";
        } else {
            let remainingMinutes = (workEnd - now) / (1000 * 60);
            
            // 如果有午休且还没到午休
            if (settings.hasLunch) {
                const [lunchStartHour, lunchStartMin] = settings.lunchStart.split(':').map(Number);
                const [lunchEndHour, lunchEndMin] = settings.lunchEnd.split(':').map(Number);
                const lunchStart = new Date(now);
                lunchStart.setHours(lunchStartHour, lunchStartMin, 0);
                const lunchEnd = new Date(now);
                lunchEnd.setHours(lunchEndHour, lunchEndMin, 0);
                
                // 如果在午休时间内
                if (now >= lunchStart && now <= lunchEnd) {
                    remainingMinutes = (workEnd - lunchEnd) / (1000 * 60);
                    timeUntilOff = "正在午休";
                } else if (now < lunchStart) {
                    // 减去午休时间
                    remainingMinutes -= (lunchEndHour - lunchStartHour) * 60 + (lunchEndMin - lunchStartMin);
                }
            }
            
            if (!timeUntilOff) {
                const hours = Math.floor(remainingMinutes / 60);
                const minutes = Math.floor(remainingMinutes % 60);
                timeUntilOff = `${hours}小时${minutes}分钟`;
            }
        }
        
        // 更新显示
        document.getElementById('time-until-off').textContent = timeUntilOff;

        // 计算工作时长（考虑午休时间）
        let totalWorkMinutes = (endHour - startHour) * 60 + (endMin - startMin);
        let lunchDuration = 0;
        
        if (settings.hasLunch) {
            const [lunchStartHour, lunchStartMin] = settings.lunchStart.split(':').map(Number);
            const [lunchEndHour, lunchEndMin] = settings.lunchEnd.split(':').map(Number);
            lunchDuration = (lunchEndHour - lunchStartHour) * 60 + (lunchEndMin - lunchStartMin);
            totalWorkMinutes -= lunchDuration;
        }

        // 计算今日收入
        const dailySalary = parseFloat(settings.salary) / parseFloat(settings.workDays);
        let earned = 0;
        
        const isWeekend = now.getDay() === 0 || now.getDay() === 6;
        
        if (!settings.salary || parseFloat(settings.salary) === 0) {
            console.log('No salary set');
            earned = 0;
        } else if (isWeekend) {
            console.log('Weekend - no earnings');
            earned = 0;
        } else {
            // 如果在工作时间内才计算收入
            if (now >= workStart && now <= workEnd) {
                // 计算实际工作分钟数
                let actualWorkedMinutes = Math.max(0, (now - workStart) / (1000 * 60));
                
                // 处理午休时间
                if (settings.hasLunch) {
                    const [lunchStartHour, lunchStartMin] = settings.lunchStart.split(':').map(Number);
                    const [lunchEndHour, lunchEndMin] = settings.lunchEnd.split(':').map(Number);
                    
                    const lunchStart = new Date(now);
                    lunchStart.setHours(lunchStartHour, lunchStartMin, 0);
                    
                    const lunchEnd = new Date(now);
                    lunchEnd.setHours(lunchEndHour, lunchEndMin, 0);
                    
                    // 如果现在是午休时间
                    if (now > lunchStart && now < lunchEnd) {
                        actualWorkedMinutes = (lunchStart - workStart) / (1000 * 60);
                    }
                    // 如果已经过了午休时间
                    else if (now >= lunchEnd) {
                        actualWorkedMinutes -= lunchDuration;
                    }
                }
                
                // 确保工作时间不为负
                actualWorkedMinutes = Math.max(0, actualWorkedMinutes);
                
                // 计算每分钟的工资
                const minuteSalary = dailySalary / totalWorkMinutes;
                console.log('Calculation details:', {
                    dailySalary,
                    totalWorkMinutes,
                    actualWorkedMinutes,
                    minuteSalary,
                    estimatedEarning: minuteSalary * actualWorkedMinutes
                });
                
                earned = (minuteSalary * actualWorkedMinutes).toFixed(2);
            }
            // 如果已经下班，显示全天工资
            else if (now > workEnd) {
                earned = dailySalary.toFixed(2);
            }
        }

        // 确保显示的金额不为负
        earned = Math.max(0, parseFloat(earned)).toFixed(2);
        
        const actualElement = document.querySelector('#earned-money .actual');
        if (actualElement) {
            actualElement.textContent = `¥${earned}`;
            console.log('Final amount displayed:', earned);
        }

        // 计算进度条
        let progress = 0;
        if (now >= workStart && now <= workEnd) {
            // 计算当前时间点到上班时间的总分钟数
            let elapsedMinutes = (now - workStart) / (1000 * 60);
            
            // 如果有午休时间，需要调整计算
            if (settings.hasLunch) {
                const [lunchStartHour, lunchStartMin] = settings.lunchStart.split(':').map(Number);
                const [lunchEndHour, lunchEndMin] = settings.lunchEnd.split(':').map(Number);
                
                const lunchStart = new Date(now);
                lunchStart.setHours(lunchStartHour, lunchStartMin, 0);
                
                const lunchEnd = new Date(now);
                lunchEnd.setHours(lunchEndHour, lunchEndMin, 0);
                
                // 如果现在是午休时间
                if (now > lunchStart && now < lunchEnd) {
                    elapsedMinutes = (lunchStart - workStart) / (1000 * 60);
                }
                // 如果已经过了午休时间
                else if (now >= lunchEnd) {
                    const lunchDuration = (lunchEndHour - lunchStartHour) * 60 + (lunchEndMin - lunchStartMin);
                    elapsedMinutes -= lunchDuration;
                }
            }
            
            // 确保不超过总工作时间
            elapsedMinutes = Math.min(elapsedMinutes, totalWorkMinutes);
            // 确保不小于0
            elapsedMinutes = Math.max(0, elapsedMinutes);
            
            progress = (elapsedMinutes / totalWorkMinutes) * 100;
        } else if (now > workEnd) {
            progress = 100;
        }
        
        // 确保进度在0-100之间
        progress = Math.min(100, Math.max(0, progress));
        
        // 更新进度条
        document.getElementById('progress').style.width = `${progress}%`;
        document.getElementById('progress-text').textContent = `${progress.toFixed(1)}%`;
    });
}

// 古诗数据
const poems = [
    "人生天地间，忽如远行客。——李白《春夜宴从弟桃花园序》",
    "莫愁前路无知己，天下谁人不识君。——高适《别董大》",
    "少壮不努力，老大徒伤悲。——汉乐府《长歌行》",
    "欲穷千里目，更上一层楼。——王之涣《登鹳雀楼》",
    "会当凌绝顶，一览众山小。——杜甫《望岳》",
    "不识庐山真面目，只缘身在此山中。——苏轼《题西林壁》",
    "千里之行，始于足下。——老子《道德经》",
    "路漫漫其修远兮，吾将上下而求索。——屈原《离骚》",
    "长风破浪会有时，直挂云帆济沧海。——李白《行路难》",
    "业精于勤，荒于嬉。——韩愈《进学解》"
];

document.addEventListener('DOMContentLoaded', () => {
    // 随机选择一句古诗
    const randomPoem = poems[Math.floor(Math.random() * poems.length)];
    document.getElementById('poem').textContent = randomPoem;

    // 加载保存的设置
    chrome.storage.sync.get({
        salary: 10000,
        workDays: 22,
        startTime: '09:00',
        endTime: '18:00',
        hasLunch: false,
        lunchStart: '12:00',
        lunchEnd: '13:00'
    }, (settings) => {
        document.getElementById('salary').value = settings.salary;
        document.getElementById('workDays').value = settings.workDays;
        document.getElementById('startTime').value = settings.startTime;
        document.getElementById('endTime').value = settings.endTime;
        document.getElementById('hasLunch').checked = settings.hasLunch;
        document.getElementById('lunchStart').value = settings.lunchStart;
        document.getElementById('lunchEnd').value = settings.lunchEnd;
        
        document.getElementById('lunchTimeInputs').style.display = 
            settings.hasLunch ? 'block' : 'none';
    });

    // 设置按钮点击事件
    document.getElementById('toggleSettings').addEventListener('click', () => {
        const panel = document.getElementById('settingsPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    // 午休复选框变化事件
    document.getElementById('hasLunch').addEventListener('change', (e) => {
        document.getElementById('lunchTimeInputs').style.display = 
            e.target.checked ? 'block' : 'none';
    });

    // 保存设置
    document.getElementById('saveSettings').addEventListener('click', () => {
        const settings = {
            salary: document.getElementById('salary').value,
            workDays: document.getElementById('workDays').value,
            startTime: document.getElementById('startTime').value,
            endTime: document.getElementById('endTime').value,
            hasLunch: document.getElementById('hasLunch').checked,
            lunchStart: document.getElementById('lunchStart').value,
            lunchEnd: document.getElementById('lunchEnd').value
        };

        chrome.storage.sync.set(settings, () => {
            alert('设置已保存！');
            updateTime(); // 立即更新显示
        });
    });
    
    // 初始更新
    updateTime();
    
    // 每分钟更新一次
    setInterval(updateTime, 60000);
}); 