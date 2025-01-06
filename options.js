document.addEventListener('DOMContentLoaded', () => {
    // 加载保存的设置
    chrome.storage.sync.get({
        salary: '',
        workDays: '',
        startTime: '',
        endTime: '',
        hasLunch: false,
        lunchStart: '',
        lunchEnd: ''
    }, (items) => {
        document.getElementById('salary').value = items.salary;
        document.getElementById('workDays').value = items.workDays;
        document.getElementById('startTime').value = items.startTime;
        document.getElementById('endTime').value = items.endTime;
        document.getElementById('hasLunch').checked = items.hasLunch;
        document.getElementById('lunchStart').value = items.lunchStart;
        document.getElementById('lunchEnd').value = items.lunchEnd;
        
        // 根据是否有午休显示/隐藏午休时间输入
        document.getElementById('lunchTimeInputs').style.display = 
            items.hasLunch ? 'block' : 'none';
    });

    // 午休复选框变化事件
    document.getElementById('hasLunch').addEventListener('change', (e) => {
        document.getElementById('lunchTimeInputs').style.display = 
            e.target.checked ? 'block' : 'none';
    });

    // 保存设置
    document.getElementById('save').addEventListener('click', () => {
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
        });
    });
}); 