const plugin = requirePlugin('WechatSI');

Page({
  data: {
    finas: '',               // 车辆 Finas 号
    records: [],             // 记录列表
    transcribedText: '',     // 语音转文字结果
    selectedTags: {},        // 存储各标签的选中状态（true/false）
    openid: '',              // 用户的 openid（需通过登录流程获取）
    isFirstRecord: true,     // 是否是第一次打点
    isRecording: false,      // 是否正在录音
    isTranscribing: false,   // 是否正在转译
    recorderManager: null,   // 录音管理器
    // 分组的展开状态，默认全部收起
    groupExpand: {
      TSA: false,
      L2Driving: false,
      L2PlusDriving: false
    },
    // 整个标签区域的展开/收起状态，默认展开
    tagsExpanded: true,
    // 固定顶部记录显示窗口的展开/收起状态，默认折叠
    recordsExpanded: false,
    // 声波图标（语音按钮）Base64 数据 URL
    voiceIcon: ''
  },

  onLoad(options) {
    // 如果从分享链接传入记录数据，则解析显示
    if (options.records) {
      const recordsText = decodeURIComponent(options.records);
      this.setData({ records: [{ time: '', description: recordsText }] });
    }
    // 模拟获取 openid（实际请在登录流程中获取）
    this.setData({ openid: 'your-openid-here' });

    // 初始化录音管理器
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

  // 输入车辆 Finas 号
  inputFinas(e) {
    this.setData({ finas: e.detail.value });
  },

  // 切换标签选中状态
  toggleTag(e) {
    const tag = e.currentTarget.dataset.text;
    let selectedTags = this.data.selectedTags;
    selectedTags[tag] = !selectedTags[tag];
    this.setData({ selectedTags });
  },

  // 更新语音转文字结果
  updateTranscribedText(e) {
    this.setData({ transcribedText: e.detail.value });
  },

  // 添加打点记录，将语音结果与标签合并
  addRecord() {
    const time = this.getCurrentTime24();
    let tagPart = '';
    for (let tag in this.data.selectedTags) {
      if (this.data.selectedTags[tag]) {
        tagPart += tag + ', ';
      }
    }
    if (tagPart) {
      tagPart = tagPart.slice(0, -2) + ' ';
    }
    const descriptionText = this.data.transcribedText || '';
    const description = tagPart + (descriptionText ? descriptionText : '');
    let records = this.data.records;
    if (this.data.isFirstRecord) {
      const date = this.getCurrentDate();
      records.push({ time: `${date} Finas: ${this.data.finas} `, description: '' });
      this.setData({ isFirstRecord: false });
    }
    records.push({ time, description });
    this.setData({
      records,
      transcribedText: '',
      selectedTags: {}
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

  // 语音录音开始
  touchStart() {
    this.setData({ isRecording: true, isTranscribing: true });
    this.data.recorderManager.start({
      duration: 60000,
      lang: 'zh_CN'
    });
  },

  // 语音录音结束
  touchEnd() {
    this.setData({ isRecording: false });
    this.data.recorderManager.stop();
  },

  // 保存记录到本地缓存
  saveRecord() {
    const key = 'record_' + new Date().toLocaleString();
    wx.setStorageSync(key, { finas: this.data.finas, records: this.data.records });
    wx.showToast({ title: 'success', icon: 'success' });
  },

  // 输出记录（复制或分享）
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
            success: () => {
              wx.showToast({ title: 'copied', icon: 'success' });
            }
          });
        } else if (res.tapIndex === 1) {
          wx.showToast({ title: 'Please click on the top right corner to forward.', icon: 'none' });
          wx.showShareMenu({ withShareTicket: true });
        }
      }
    });
  },

  // 配置分享功能，将记录内容作为分享标题及参数传递
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

  // 切换整个标签区域的展开/收起状态
  toggleTags() {
    this.setData({ tagsExpanded: !this.data.tagsExpanded });
  },

  // 切换分组展开状态
  toggleGroup(e) {
    const group = e.currentTarget.dataset.group;
    let groupExpand = this.data.groupExpand;
    groupExpand[group] = !groupExpand[group];
    this.setData({ groupExpand });
  },

  // 切换固定顶部记录显示窗口的展开/收起状态
  toggleRecords() {
    this.setData({ recordsExpanded: !this.data.recordsExpanded });
  }
});
