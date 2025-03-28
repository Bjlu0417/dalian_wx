Page({
  data: {
    finas: '',
    records: [],
    transcribedText: '',
    selectedTags: {},
    openid: '',
    isFirstRecord: true,
    isRecording: false,
    isTranscribing: false,
    recorderManager: null,
    isEditing: false,
    key: '',
    groupExpand: {
      TSA: false,
      L2Driving: false,
      L2PlusDriving: false
    },
    tagsExpanded: true,
    recordsExpanded: false,
    recordScrollTop: 0,
    animationData: {},
    voiceIcon: '',
    currentRecordTime: '' // 新增字段：记录时间
  },

  onLoad(options) {
    // 如果从分享链接传入记录数据，则解析显示
    if (options.records) {
      const records = JSON.parse(decodeURIComponent(options.records));
      this.setData({ records });
    }
    if (options.finas) {
      this.setData({ finas: options.finas });
    }
    // 如果有 key 参数，则认为是编辑模式
    if (options.key) {
      this.setData({
        key: options.key,
        isEditing: true
      });
    }
    // 模拟获取 openid（实际请在登录流程中获取）
    this.setData({ openid: 'your-openid-here' });

    // 初始化录音管理器（使用 WechatSI 插件）
    const plugin = requirePlugin('WechatSI');
    this.setData({
      recorderManager: plugin.getRecordRecognitionManager()
    });
    this.data.recorderManager.onStop = (res) => {
      console.log('录音结束，转译结果：', res);
      this.setData({
        isRecording: false,
        isTranscribing: false,
        transcribedText: res.result
      });
    };
    this.data.recorderManager.onError = (err) => {
      console.error('录音失败：', err);
      wx.showToast({ title: '录音失败', icon: 'none' });
      this.setData({ isRecording: false, isTranscribing: false });
    };

    // 初始化动画对象，用于底部区域动画
    this.animation = wx.createAnimation({
      duration: 300,
      timingFunction: 'ease-out'
    });

    // 使用 Blob 和 FileReader 将 SVG 声波图标转换为 Base64 DataURL
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
      <rect x="4" y="22" width="6" height="20" fill="#fff"/>
      <rect x="14" y="18" width="6" height="28" fill="#fff"/>
      <rect x="24" y="14" width="6" height="36" fill="#fff"/>
      <rect x="34" y="10" width="6" height="44" fill="#fff"/>
      <rect x="44" y="14" width="6" height="36" fill="#fff"/>
      <rect x="54" y="18" width="6" height="28" fill="#fff"/>
    </svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      console.log('voiceIcon dataUrl:', dataUrl);
      this.setData({ voiceIcon: dataUrl });
    };
    reader.readAsDataURL(blob);
  },

  // 输入框 focus 事件：当输入框获得焦点时，上移底部栏
  onInputFocus(e) {
    // 假设 e.detail.height 返回键盘高度；若无值则设为300px
    const keyboardHeight = e.detail.height || 300;
    // 默认底部栏距离屏幕底部为20px，因此上移距离 = keyboardHeight - 20
    const offset = 20 - keyboardHeight;
    this.animation.translateY(offset).step();
    this.setData({
      animationData: this.animation.export()
    });
  },

  // 输入框 blur 事件：恢复底部栏到固定在屏幕底部（20px上）
  onInputBlur(e) {
    this.animation.translateY(0).step();
    this.setData({
      animationData: this.animation.export()
    });
  },

  // 获取当前日期 YYYY-MM-DD
  getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 获取当前时间 HH:MM:SS
  getCurrentTime24() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  },

  // 添加打点记录：编辑模式下直接追加；否则新建记录时先添加车辆信息记录
  addRecord() {
    const time = this.getCurrentTime24(); // 获取当前时间
    this.setData({ currentRecordTime: time }); // 记录当前点击时间
    this.setData({
      isFirstRecord: false
    });
  },

  submitAndSaveRecord() {
    const time = this.data.currentRecordTime || this.getCurrentTime24(); // 使用 currentRecordTime，若为空则使用当前时间
    let tagPart = '';
    for (let tag in this.data.selectedTags) {
      if (this.data.selectedTags[tag]) {
        tagPart += tag + ', ';
      }
    }
    if (tagPart) {
      tagPart = tagPart.slice(0, -2) + ' '; // 清除最后的逗号和空格
    }
    const descriptionText = this.data.transcribedText || ''; // 获取描述文本
    const description = tagPart + (descriptionText ? descriptionText : ''); // 拼接描述
    const records = this.data.records; // 获取现有记录
    records.push({ time, description }); // 添加新记录
    this.setData({
      records,
      transcribedText: '', // 清空输入框
      selectedTags: {}, // 清空选中的标签
      currentRecordTime: '' // 清空记录时间
    });
    this.saveRecord(); // 保存记录
  },

  // 保存记录到本地缓存
  saveRecord() {
    let key = this.data.key;
    if (!this.data.isEditing) {
      key = 'record_' + new Date().toLocaleString(); // 使用当前时间戳作为键
    }
    wx.setStorageSync(key, { finas: this.data.finas, records: this.data.records });
    wx.showToast({ title: '保存成功', icon: 'success' });
  },


  // 录音前检查权限并启动录音
  checkRecordPermissionAndStart() {
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.record']) {
          wx.authorize({
            scope: 'scope.record',
            success: () => { this.startRecording(); },
            fail: () => {
              wx.showModal({
                title: '提示',
                content: '录音功能需要获取您的录音权限，请前往设置页面开启权限。',
                success: (res) => { if (res.confirm) wx.openSetting(); }
              });
            }
          });
        } else {
          this.startRecording();
        }
      },
      fail: (err) => { console.error('获取设置失败', err); }
    });
  },

  // 启动录音
  startRecording() {
    this.setData({ isRecording: true, isTranscribing: true });
    this.data.recorderManager.start({
      duration: 60000,
      lang: 'zh_CN'
    });
  },

  // 录音相关函数
  touchStart() {
    this.checkRecordPermissionAndStart();
  },

  touchEnd() {
    this.setData({ isRecording: false });
    this.data.recorderManager.stop();
  },

  inputFinas(e) {
    this.setData({ finas: e.detail.value });
  },

  toggleTag(e) {
    const tag = e.currentTarget.dataset.text;
    let selectedTags = this.data.selectedTags;
    selectedTags[tag] = !selectedTags[tag];
    this.setData({ selectedTags });
  },

  updateTranscribedText(e) {
    this.setData({ transcribedText: e.detail.value });
  },

  output() {
    wx.showActionSheet({
      itemList: ['Copy to clipboard', 'Share to Wechat'],
      success: (res) => {
        if (res.tapIndex === 0) {
          const recordsText = this.data.records
            .map(r => `${r.time}: ${r.description}`)
            .join('\n');
          wx.setClipboardData({
            data: recordsText,
            success: () => { wx.showToast({ title: 'copied', icon: 'success' }); }
          });
        } else if (res.tapIndex === 1) {
          wx.showToast({ title: 'Please click on the top right corner to forward.', icon: 'none' });
          wx.showShareMenu({ withShareTicket: true });
        }
      }
    });
  },

  onShareAppMessage() {
    const recordsText = this.data.records
      .map(r => `${r.time}: ${r.description}`)
      .join('\n');
    const shareTitle = recordsText.length > 50 ? recordsText.substring(0, 50) + '...' : recordsText;
    return {
      title: shareTitle,
      path: '/pages/index/index?records=' + encodeURIComponent(recordsText)
    };
  },

  toggleTags() {
    this.setData({ tagsExpanded: !this.data.tagsExpanded });
  },

  toggleGroup(e) {
    const group = e.currentTarget.dataset.group;
    let groupExpand = this.data.groupExpand;
    groupExpand[group] = !groupExpand[group];
    this.setData({ groupExpand });
  },

  // 切换记录窗口展开/收起，并自动滚动到底部
  toggleRecords() {
    this.setData({ recordsExpanded: !this.data.recordsExpanded }, () => {
      if (this.data.recordsExpanded) {
        setTimeout(() => {
          this.setData({ recordScrollTop: 9999 });
        }, 100);
      }
    });
  }
});

