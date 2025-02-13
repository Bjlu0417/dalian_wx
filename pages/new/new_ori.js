// 引入微信同声传译插件
const plugin = requirePlugin('WechatSI');

//console.log('插件加载成功:', plugin);

Page({
  data: {
    finas: '', // 车辆Finas号
    records: [], // 记录列表
    presetDescriptions: ['匝道限速未/误取', '主路限速未/误取', '龙门架限速有误'], // 预设问题描述
    customDescription: '', // 自定义问题描述
    currentDescription: '', // 当前选中的问题描述，是选中的presetDescriptions里的预设问题描述
    editKey: '', // 编辑的记录的唯一标识
    isFirstRecord: true, // 是否是第一次打点
    isRecording: false, // 是否正在录音
    isTranscribing: false, // 是否正在转译
    transcribedText: '', // 转译后的文字 //result: '' // 语音识别结果
    recorderManager: null // 录音管理器
  },

  onLoad: function(options){
    if (options.key) {
      // 如果是编辑历史记录
      const finas = options.finas;
      const records = JSON.parse(decodeURIComponent(options.records));
      this.setData({
        finas,
        records,
        editKey: options.key,
        isFirstRecord: false // 编辑历史记录时，不是第一次打点
      });
    }

    // 初始化录音管理器
    this.setData({
      recorderManager: plugin.getRecordRecognitionManager()
    });

    /*this.data.recorderManager.onRecognize = function(e) {
      console.log(e);
      if (e.transcribedText === '') return;
      const text = this.data.transcribedText + e.transcribedText;
      that.setData({
        transcribedText: text
      });
    };*/

    // this.data.recorderManager = manager
    /*this.data.recorderManager.onStart = function (e) {  
      console.log('成功开始识别', e);
    };*/

    // 监听录音结束事件
    this.data.recorderManager.onStop = (res) => {
      console.log('录音结束，开始转译', res);
      const text = res.result; // 获取识别结果
      this.setData({
        isRecording: false,
        isTranscribing: false, // 转译完成
        transcribedText: text // 将转换后的文字显示在输入框中
      });
    };

    // 监听录音错误事件
    this.data.recorderManager.onError = (err) => {
      console.error('录音失败', err); 
      wx.showToast({
        title: '录音失败',
        icon: 'none'
      });
      this.setData({
        isRecording: false,
        isTranscribing: false
      });
    };
  },

  // 输入车辆Finas号
  inputFinas(e) {
    this.setData({
      finas: e.detail.value
    });
  },

  // 添加记录
  addRecord() {
    const time = this.getCurrentTime24(); // 获取当前时间（24小时制）
    const description = this.data.currentDescription || this.data.transcribedText || this.data.customDescription || '无描述';
    const records = this.data.records;

    if (this.data.isFirstRecord) {
      // 如果是第一次打点，添加日期和Finas号行
      const date = this.getCurrentDate();
      records.push({ time: date, description: '' }); // 日期行
      records.push({ time: `Finas号: ${this.data.finas}`, description: '' }); // Finas号行
      this.setData({
        isFirstRecord: false
      });
    }

    // 添加打点记录
    records.push({ time, description });
    this.setData({
      records,
      currentDescription: '', // 清空当前选中的问题描述
      transcribedText: '', // 清空转译文字
      customDescription: '' // 清空自定义问题描述
    });
  },

  // 获取当前日期（年月日）
  getCurrentDate() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 补零
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // 获取当前时间（24小时制）
  getCurrentTime24() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0'); // 补零
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  },

  // 选择预设问题描述
  selectDescription(e) {
    this.setData({
      currentDescription: e.currentTarget.dataset.item
    });
  },

  // 输入自定义问题描述 新加的
  inputCustomDescription(e) {
    this.setData({
      customDescription: e.detail.value
    });
  },

  // 更新转译后的文字
  updateTranscribedText(e) {
    this.setData({
      transcribedText: e.detail.value
    });
  },

  // 按住说话
  touchStart() {
    //console.log('start');
    this.setData({
      //resultText: '语音识别中...',
      isRecording: true,
      isTranscribing: true // 开始转译
    });

    // 开始录音, 语音开始识别
    this.data.recorderManager.start({
      duration: 60000,
      lang: 'zh_CN' // 语言类型，中文
    });
  },

  // 松开结束
  touchEnd() {
    //console.log('end');
    this.setData({
      isRecording: false
    });

    // 停止录音
    this.data.recorderManager.stop();
  },

  // 保存记录
  saveRecord() {
    const records = this.data.records;
    const finas = this.data.finas;
    const key = this.data.editKey || `record_${new Date().toLocaleString()}`; // 使用当前时间作为 key
    wx.setStorageSync(key, { finas, records });
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  // Output 功能
  output() {
    wx.showActionSheet({
      itemList: ['发送至邮箱', '复制到剪贴板'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.showModal({
            title: '输入邮箱',
            content: '请输入邮箱地址',
            success: (res) => {
              if (res.confirm) {
                // 发送邮件逻辑（需后端支持）
                wx.showToast({
                  title: '邮件发送成功',
                  icon: 'success'
                });
              }
            }
          });
        } else if (res.tapIndex === 1) {
          const recordsText = this.data.records.map(r => `${r.time}: ${r.description}`).join('\n');
          wx.setClipboardData({
            data: recordsText,
            success: () => {
              wx.showToast({
                title: '复制成功',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  }
});