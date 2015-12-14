import React from 'react'
import Materialize from 'materialize'

import CopyToClipboard from '../util/copy-to-clipboard'

class MultiValueDisplay extends React.Component {
  _copyToClipboard(value) {
    CopyToClipboard(value)
      .then(() => Materialize.toast(`Copied '${ value }' to clipboard!`, 2000))
      .catch(() => Materialize.toast("Can't copy to clipboard.", 4000, "red darken-4"))
  }

  render() {
    return <div className="multi-value tooltipped"
         data-position="bottom"
         data-delay="50"
         data-tooltip={this.props.real}>
      {this.props.nice}

      <a className="waves-effect waves-teal btn-flat" onClick={this._copyToClipboard.bind(this, this.props.nice)}>
        <i className="material-icons">content_copy</i>
      </a>
      <a className="waves-effect waves-teal btn-flat" onClick={this._copyToClipboard.bind(this, this.props.real)}>
        <i className="material-icons">code</i>
      </a>
      <a className="waves-effect waves-teal btn-flat disabled" onClick={this.props.block}>
        <i className="material-icons">block</i>
      </a>
    </div>;
  }
}

export default MultiValueDisplay