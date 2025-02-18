Page({
  data: {
    records: [] // 历史记录列表
  },

  onLoad() {
    this.loadRecords();
  },

  // 加载历史记录
  loadRecords() {
    const records = [];
    const keys = wx.getStorageInfoSync().keys;
    const now = new Date().getTime(); // 当前时间戳

    keys.forEach(key => {
      if (key.startsWith('record_')) {
        const record = wx.getStorageSync(key);
        const recordTime = this.getRecordTimeFromKey(key); // 从 key 中提取记录时间
        const recordTimestamp = new Date(recordTime).getTime(); // 转换为时间戳

        // 判断记录是否在最近三天内
        if (now - recordTimestamp <= 3 * 24 * 60 * 60 * 1000) {
          records.push({ key, ...record });
        } else {
          // 删除超过三天的记录
          wx.removeStorageSync(key);
        }
      }
    });

    // 按时间倒序排序
    records.sort((a, b) => {
      const timeA = this.getRecordTimeFromKey(a.key);
      const timeB = this.getRecordTimeFromKey(b.key);
      return new Date(timeB).getTime() - new Date(timeA).getTime();
    });

    this.setData({
      records
    });
  },

  // 从 key 中提取记录时间
  getRecordTimeFromKey(key) {
    // key 的格式是 "record_2023-10-01 12:30:45"
    return key.replace('record_', '');
  },

  // 编辑选中的记录
  editRecord(e) {
    const index = e.currentTarget.dataset.index;
    const record = this.data.records[index];
    wx.navigateTo({
      url: `/pages/new/new?key=${record.key}&finas=${record.finas}&records=${encodeURIComponent(JSON.stringify(record.records))}`
    });
  },

  // 弹出删除记录确认
  deleteRecord(e) {
    const index = e.currentTarget.dataset.index;
    const record = this.data.records[index];
    wx.showModal({
      title: 'Delete record?',
      content: 'Record deletion is not recoverable!',
      complete: (res) => {
        if (res.confirm) {
          this.confirmDeletion(index, record.key);  // 传入记录的 key
        }
      }
    });
  },

  // 确认删除操作
  confirmDeletion(index, key) {
    // 从 records 中删除指定记录
    const newRecords = this.data.records.filter((item, i) => i !== index);

    // 删除本地存储中的记录
    wx.removeStorageSync(key);

    // 更新页面上的记录列表
    this.setData({
      records: newRecords,
    });

    wx.showToast({
      title: 'Deleted',
      icon: 'success',
    });
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadRecords(); // 重新加载历史记录
    wx.stopPullDownRefresh(); // 停止下拉刷新动画
  }
});
