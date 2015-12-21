import React from 'react'
import ClassNames from 'classnames'

import PacketRow from './packet-row'

export default class PacketTable extends React.Component {
  constructor() {
    super();

    // todo: "listen" to prop changes & update state
    this.state = {
      numberPacketsToDisplay: 10 // todo: access props, this.props.numberPacketsToDisplay
    }
  }

  render() {
    let rendered_packets;
    let packets = this.props.packets;
    if (packets.length > 0) {
      // todo: re-enable length-limiting `.slice(0, this.state.numberPacketsToDisplay)`
      rendered_packets = packets.map((packet, packetIndex) =>
        <PacketRow key={packet._id}
                   packet={packet}
                   packetIndex={packetIndex}
                   rdns={this.props.rdns}
                   inspectJson={this.props.inspectJson}
                   inspectBuffer={this.props.inspectBuffer} />
      );
      // todo: how to batch-pass properties?
    } else {
      rendered_packets = <tr><td colSpan="9"><i className="grey-text">No packets captured.</i></td></tr>;
    }

    return <div className="packet-table--wrapper">
      <table className="highlight">
        <thead>
        <tr>
          <th>#</th>
          <th>Time</th>
          <th>User</th>
          <th><i className="material-icons">swap_horiz</i></th>
          <th>Protocol</th>
          <th>IP</th>
          <th>Port</th>
          <th>Flags</th>
          <th>Tools</th>
        </tr>
        </thead>
        <tbody>
        {rendered_packets}
        </tbody>
      </table>

      <div className="action-bar" style={{marginTop: '2rem'}}>
        <a className={ClassNames('btn', {'disabled':  packets.length <= this.state.numberPacketsToDisplay})}
           onClick={(() => this.setState({ numberPacketsToDisplay: this.state.numberPacketsToDisplay + 50 })).bind(this)}>
          <i className="material-icons">expand_more</i>
        </a>

        <a className={ClassNames('btn', {'disabled': packets.length <= this.state.numberPacketsToDisplay})}
           onClick={(() => this.setState({ numberPacketsToDisplay: packets.length })).bind(this)}>
          <i className="material-icons">all_inclusive</i>
        </a>
      </div>
    </div>;
  }
}