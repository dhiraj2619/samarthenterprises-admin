import Icon from './Icon.jsx'

export default function ProductTable({ items, onEdit, compact = false }) {
  return <div className="table-scroll">
    <table className={`product-table ${compact ? 'compact' : ''}`}>
      <thead>
        <tr>
          <th>Product</th>
          {!compact && <th>Description</th>}
          <th>Category</th>
          <th>Images</th>
          <th>Most buy</th>
          <th>Stock</th>
          {!compact && <><th>HSN code</th><th>GST rate</th><th>Rating</th></>}
          <th><span className="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const images = item.images || []
          return <tr key={item._id}>
            <td>
              <div className="product-name">
                <span className={`product-thumb tone-${index % 4}`}>{images[0] ? <img src={images[0].url} alt="" loading="lazy" /> : <Icon name="products" size={22} />}</span>
                <div>
                  <strong>{item.name}</strong>
                  {item.isActive === false ? <small className="hidden-tag">Hidden from website</small> : item.hsnCode && <small>HSN {item.hsnCode}</small>}
                </div>
              </div>
            </td>
            {!compact && <td><p className="clamp">{item.description}</p></td>}
            <td>{item.categoryId?.name || <span className="muted">—</span>}</td>
            <td>
              {images.length ? <div className="thumb-stack">
                {images.slice(0, 3).map((image, i) => <img key={image.public_id || i} src={image.url} alt={`${item.name} image ${i + 1}`} loading="lazy" />)}
                {images.length > 3 && <span>+{images.length - 3}</span>}
              </div> : <span className="muted">No images</span>}
            </td>
            <td>{item.isMostBuy ? <span className="badge gold"><Icon name="star" size={12} />Yes</span> : <span className="muted">—</span>}</td>
            <td><span className={`badge ${item.inStock ? '' : 'out'}`}><i />{item.inStock ? 'In stock' : 'Out of stock'}</span></td>
            {!compact && <>
              <td>{item.hsnCode || <span className="muted">—</span>}</td>
              <td>{item.gstRate !== undefined && item.gstRate !== null ? `${item.gstRate}%` : <span className="muted">—</span>}</td>
              <td>{item.ratings ? <span className="rating"><Icon name="star" size={14} />{Number(item.ratings).toFixed(1)}</span> : <span className="muted">—</span>}</td>
            </>}
            <td><button className="text-button" onClick={() => onEdit(item)}>Edit <Icon name="arrow" size={15} /></button></td>
          </tr>
        })}
      </tbody>
    </table>
  </div>
}
