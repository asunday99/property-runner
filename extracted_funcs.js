const formatMoney = (num) => {
            if (!num) return '0 원';
            return new Intl.NumberFormat('ko-KR').format(Math.round(num)) + ' 원';
        };

let growthChart = null;
        let ltvChart = null;
        let roiChart = null;
        
        Chart.defaults.color = '#94a3b8';
        Chart.defaults.font.family = 'Pretendard';





