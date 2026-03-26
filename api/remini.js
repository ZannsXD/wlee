export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { image, scale } = req.body;
    const buffer = Buffer.from(image.split(',')[1], 'base64');

    const html = await fetch('https://www.iloveimg.com/upscale-image').then(r => r.text());
    const token = html.match(/"token":"(eyJ[^"]+)"/)?.[1];
    const task = html.match(/ilovepdfConfig\.taskId\s*=\s*'([^']+)'/)?.[1];

    if (!token || !task) {
      throw new Error('Gagal mendapatkan session token dari server.');
    }

    const uploadForm = new FormData();
    uploadForm.append('name', 'image.jpg');
    uploadForm.append('chunk', '0');
    uploadForm.append('chunks', '1');
    uploadForm.append('task', task);
    uploadForm.append('preview', '1');
    uploadForm.append('v', 'web.0');
    
    const blob = new Blob([buffer], { type: 'image/jpeg' });
    uploadForm.append('file', blob, 'image.jpg');

    const upRes = await fetch('https://api29g.iloveimg.com/v1/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://www.iloveimg.com',
        'Referer': 'https://www.iloveimg.com/'
      },
      body: uploadForm
    });

    const upData = await upRes.json();
    const serverfilename = upData.server_filename;

    const upscaleForm = new FormData();
    upscaleForm.append('task', task);
    upscaleForm.append('server_filename', serverfilename);
    upscaleForm.append('scale', scale || '4');

    const finalRes = await fetch('https://api29g.iloveimg.com/v1/upscale', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://www.iloveimg.com',
        'Referer': 'https://www.iloveimg.com/'
      },
      body: upscaleForm
    });

    if (!finalRes.ok) throw new Error('Proses upscale gagal di server.');

    const finalBuffer = await finalRes.arrayBuffer();
    const base64 = Buffer.from(finalBuffer).toString('base64');

    res.status(200).json({
      result: `data:image/jpeg;base64,${base64}`
    });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
