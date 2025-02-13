Page({
  createNew() {
    wx.navigateTo({
      url: '/pages/new/new'
    });
  },
  viewHistory() {
    wx.navigateTo({
      url: '/pages/history/history'
    });
  }
});