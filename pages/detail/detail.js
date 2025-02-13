Page({
  data: {
    finas: '',
    records: []
  },

  onLoad(options) {
    const finas = options.finas;
    const records = JSON.parse(decodeURIComponent(options.records));
    this.setData({
      finas,
      records
    });
  }
});